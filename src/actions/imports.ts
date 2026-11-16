"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { categories, db, importedProducts, products, suppliers, variants } from "@/db";
import { fail, run } from "@/lib/action";
import { requireSupplier } from "@/lib/auth";
import { generateImportToken, hashToken } from "@/lib/importer";

async function requireImporter() {
  const ctx = await requireSupplier();
  if (!ctx.supplier.importerEnabled) fail("O importador não está liberado para sua conta. Fale com o suporte.");
  return ctx;
}

const PREFIX: Record<string, string> = { MERCADO_LIVRE: "ML", SHOPEE: "SHP", TIKTOK: "TTK", TEMU: "TMU", OUTRO: "IMP" };

function abbr(v: string) {
  return (
    v
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase() || "X"
  );
}

function weightFromAttributes(attrs: { name: string; value: string }[]) {
  const a = attrs.find((x) => /^peso\b|weight/i.test(x.name));
  const m = a?.value.replace(",", ".").match(/([\d.]+)\s*(kg|g)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(m[2].toLowerCase() === "kg" ? n * 1000 : n);
}

const convertSchema = z.object({
  price: z.number().int().min(1, "Informe o preço para o revendedor").max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  categoryId: z.string().nullable().optional(),
  publish: z.boolean(),
});

/** Cria o produto a partir do anuncio importado. publish=true libera direto para os revendedores. */
export async function convertImport(id: string, input: z.infer<typeof convertSchema>) {
  return run(async () => {
    const { supplier } = await requireImporter();
    const d = convertSchema.parse(input);
    return db.transaction(async (tx) => {
      const imp = await tx.query.importedProducts.findFirst({ where: and(eq(importedProducts.id, id), eq(importedProducts.supplierId, supplier.id)) });
      if (!imp) fail("Importação não encontrada.");
      if (imp.status === "CONVERTED" && imp.productId) fail("Este anúncio já foi cadastrado.");

      let categoryId: string | null = null;
      if (d.categoryId) {
        const c = await tx.query.categories.findFirst({ where: and(eq(categories.id, d.categoryId), eq(categories.supplierId, supplier.id)) });
        categoryId = c?.id ?? null;
      }

      // SKU unico no catalogo do fornecedor
      const base = (imp.sku ? `${PREFIX[imp.source] ?? "IMP"}-${imp.sku}` : `${PREFIX[imp.source] ?? "IMP"}-${Math.random().toString(36).slice(2, 8)}`)
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, "")
        .slice(0, 40);
      let sku = base;
      for (let i = 2; await tx.query.products.findFirst({ where: and(eq(products.supplierId, supplier.id), eq(products.sku, sku)), columns: { id: true } }); i++) {
        sku = `${base}-${i}`;
      }

      const attrs = imp.attributes ?? [];
      const brand = imp.brand || attrs.find((a) => /^marca$|^brand$/i.test(a.name))?.value || null;
      const description = [imp.description?.trim(), attrs.length ? `Características:\n${attrs.map((a) => `- ${a.name}: ${a.value}`).join("\n")}` : ""]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 20000);
      const title = imp.title.slice(0, 200);
      const groups = (imp.variations ?? []).filter((v) => v.values.length).slice(0, 3);
      const combos = groups.length ? groups.reduce<string[][]>((acc, g) => acc.flatMap((a) => g.values.map((v) => [...a, v])), [[]]).slice(0, 200) : [];

      const [p] = await tx
        .insert(products)
        .values({
          supplierId: supplier.id,
          categoryId,
          name: title,
          sku,
          brand,
          titleShopee: title.slice(0, 120),
          titleMl: title.slice(0, 60),
          description,
          images: imp.images,
          price: d.price,
          suggestedPrice: imp.price,
          weightGrams: weightFromAttributes(attrs),
          ean: imp.gtin || null,
          status: d.publish ? "ACTIVE" : "DRAFT",
          hasVariants: combos.length > 0,
          optionNames: combos.length ? groups.map((g) => g.name) : [],
          tags: [],
        })
        .returning({ id: products.id });

      const rows = combos.length
        ? combos.map((c, i) => ({ productId: p.id, name: c.join(" / "), sku: `${sku}-${c.map(abbr).join("-")}-${i + 1}`, options: c, stock: d.stock, position: i }))
        : [{ productId: p.id, name: "Único", sku, options: [] as string[], stock: d.stock, position: 0 }];
      await tx.insert(variants).values(rows);

      await tx.update(importedProducts).set({ status: "CONVERTED", productId: p.id }).where(eq(importedProducts.id, imp.id));
      revalidatePath("/f/importados");
      return { productId: p.id, published: d.publish };
    });
  });
}

export async function setImportStatus(ids: string[], status: "PENDING" | "DISCARDED") {
  return run(async () => {
    const { supplier } = await requireImporter();
    const list = ids.slice(0, 200);
    if (!list.length) return;
    await db
      .update(importedProducts)
      .set({ status })
      .where(and(eq(importedProducts.supplierId, supplier.id), inArray(importedProducts.id, list)));
  }, status === "DISCARDED" ? "Descartado" : "Restaurado");
}

export async function deleteImports(ids: string[]) {
  return run(async () => {
    const { supplier } = await requireImporter();
    const list = ids.slice(0, 200);
    if (!list.length) return;
    await db.delete(importedProducts).where(and(eq(importedProducts.supplierId, supplier.id), inArray(importedProducts.id, list)));
  }, "Removido");
}

/** Gera um novo codigo de conexao para colar na extensao (desconecta o anterior). */
export async function regenerateImportToken() {
  return run(async () => {
    const { supplier } = await requireImporter();
    const token = generateImportToken();
    await db.update(suppliers).set({ importTokenHash: hashToken(token), importTokenCreatedAt: new Date() }).where(eq(suppliers.id, supplier.id));
    return { token };
  });
}
