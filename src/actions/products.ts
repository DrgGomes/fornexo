"use server";

import { and, count, eq, inArray, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { categories, db, orderItems, products, variants } from "@/db";
import { fail, run } from "@/lib/action";
import { requireSupplier } from "@/lib/auth";
import { normalizeImageUrl } from "@/lib/images";

const cents = z.number().int().min(0).max(100_000_000);
const optCents = cents.nullable().optional();
const optNum = z.number().min(0).max(100000).nullable().optional();
const optStr = z.string().trim().max(5000).nullable().optional();

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Variação sem nome").max(120),
  sku: z.string().trim().min(1, "Toda variação precisa de SKU").max(80),
  options: z.array(z.string().trim().max(60)).max(5),
  price: optCents,
  stock: z.number().int().min(-100000).max(10_000_000),
  imageUrl: optStr,
  ean: optStr,
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome do produto").max(200),
  sku: z.string().trim().min(1, "Informe o SKU").max(80),
  brand: optStr,
  categoryId: z.string().nullable().optional(),
  newCategory: z.string().trim().max(60).optional(),
  titleShopee: z.string().trim().max(200).nullable().optional(),
  titleMl: z.string().trim().max(200).nullable().optional(),
  description: z.string().max(20000),
  images: z.array(z.string()).max(30),
  videoUrl: optStr,
  price: cents.refine((v) => v > 0, "Informe o preço para o revendedor"),
  suggestedPrice: optCents,
  costPrice: optCents,
  weightGrams: z.number().int().min(0).max(1_000_000).nullable().optional(),
  heightCm: optNum,
  widthCm: optNum,
  lengthCm: optNum,
  ean: optStr,
  ncm: optStr,
  tags: z.array(z.string().trim().max(40)).max(30),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  featured: z.boolean(),
  lowStockAlert: z.number().int().min(0).max(100000),
  hasVariants: z.boolean(),
  optionNames: z.array(z.string().trim().min(1).max(40)).max(3),
  variants: z.array(variantSchema).min(1, "Adicione ao menos uma variação").max(300),
});

export type ProductPayload = z.infer<typeof productSchema>;

export async function saveProduct(payload: ProductPayload) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const d = productSchema.parse(payload);
    const images = d.images.map((u) => normalizeImageUrl(u)).filter((u): u is string => !!u);
    let vs = d.variants;
    if (!d.hasVariants) vs = [{ ...vs[0], name: "Único", sku: d.sku, options: [], price: null }];
    const skus = vs.map((v) => v.sku.toUpperCase());
    if (new Set(skus).size !== skus.length) fail("Existem SKUs repetidos nas variações.");

    return db.transaction(async (tx) => {
      let categoryId = d.categoryId || null;
      if (d.newCategory) {
        const [c] = await tx
          .insert(categories)
          .values({ supplierId: supplier.id, name: d.newCategory })
          .onConflictDoUpdate({ target: [categories.supplierId, categories.name], set: { name: d.newCategory } })
          .returning({ id: categories.id });
        categoryId = c.id;
      } else if (categoryId) {
        const c = await tx.query.categories.findFirst({ where: and(eq(categories.id, categoryId), eq(categories.supplierId, supplier.id)) });
        if (!c) categoryId = null;
      }

      const values = {
        name: d.name,
        sku: d.sku,
        brand: d.brand || null,
        categoryId,
        titleShopee: d.titleShopee || null,
        titleMl: d.titleMl || null,
        description: d.description,
        images,
        videoUrl: d.videoUrl && /^https?:\/\//i.test(d.videoUrl.trim()) ? d.videoUrl.trim() : null,
        price: d.price,
        suggestedPrice: d.suggestedPrice || null,
        costPrice: d.costPrice ?? null,
        weightGrams: d.weightGrams ?? null,
        heightCm: d.heightCm ?? null,
        widthCm: d.widthCm ?? null,
        lengthCm: d.lengthCm ?? null,
        ean: d.ean || null,
        ncm: d.ncm || null,
        tags: d.tags.filter(Boolean),
        status: d.status,
        featured: d.featured,
        lowStockAlert: d.lowStockAlert,
        hasVariants: d.hasVariants,
        optionNames: d.hasVariants ? d.optionNames : [],
      };

      let productId: string;
      if (d.id) {
        const existing = await tx.query.products.findFirst({ where: and(eq(products.id, d.id), eq(products.supplierId, supplier.id)) });
        if (!existing) fail("Produto não encontrado.");
        await tx.update(products).set(values).where(eq(products.id, d.id));
        productId = d.id;
      } else {
        const [p] = await tx
          .insert(products)
          .values({ ...values, supplierId: supplier.id })
          .returning({ id: products.id });
        productId = p.id;
      }

      const keepIds = vs.map((v) => v.id).filter((x): x is string => !!x);
      if (d.id) {
        await tx
          .delete(variants)
          .where(keepIds.length ? and(eq(variants.productId, productId), notInArray(variants.id, keepIds)) : eq(variants.productId, productId));
      }
      const owned = keepIds.length
        ? new Set(
            (await tx.select({ id: variants.id }).from(variants).where(and(eq(variants.productId, productId), inArray(variants.id, keepIds)))).map(
              (r) => r.id,
            ),
          )
        : new Set<string>();

      for (const [i, v] of vs.entries()) {
        const row = {
          name: v.name,
          sku: v.sku,
          options: v.options,
          price: v.price ?? null,
          stock: v.stock,
          imageUrl: v.imageUrl ? normalizeImageUrl(v.imageUrl) : null,
          ean: v.ean || null,
          position: i,
        };
        if (v.id && owned.has(v.id)) await tx.update(variants).set(row).where(eq(variants.id, v.id));
        else await tx.insert(variants).values({ ...row, productId });
      }
      revalidatePath("/f/produtos");
      return { id: productId };
    });
  }, "Produto salvo");
}

async function ownedProduct(id: string, supplierId: string) {
  const p = await db.query.products.findFirst({ where: and(eq(products.id, id), eq(products.supplierId, supplierId)), with: { variants: true } });
  if (!p) fail("Produto não encontrado.");
  return p;
}

export async function duplicateProduct(id: string) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const p = await ownedProduct(id, supplier.id);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return db.transaction(async (tx) => {
      const { id: _id, createdAt: _c, updatedAt: _u, variants: vs, ...rest } = p;
      const [np] = await tx
        .insert(products)
        .values({ ...rest, name: `${p.name} (cópia)`, sku: `${p.sku}-${suffix}`, status: "DRAFT" })
        .returning({ id: products.id });
      await tx.insert(variants).values(
        vs.map(({ id: _v, productId: _p, ...v }) => ({ ...v, productId: np.id, sku: `${v.sku}-${suffix}` })),
      );
      return { id: np.id };
    });
  }, "Produto duplicado como rascunho");
}

export async function setProductStatus(id: string, status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
  return run(async () => {
    const { supplier } = await requireSupplier();
    await ownedProduct(id, supplier.id);
    await db.update(products).set({ status }).where(eq(products.id, id));
  }, status === "ACTIVE" ? "Produto ativado" : status === "ARCHIVED" ? "Produto arquivado" : "Produto em rascunho");
}

export async function toggleFeatured(id: string) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const p = await ownedProduct(id, supplier.id);
    await db.update(products).set({ featured: !p.featured }).where(eq(products.id, id));
  });
}

export async function deleteProduct(id: string) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    await ownedProduct(id, supplier.id);
    const [{ n }] = await db.select({ n: count() }).from(orderItems).where(eq(orderItems.productId, id));
    if (n > 0) {
      await db.update(products).set({ status: "ARCHIVED" }).where(eq(products.id, id));
      return { archived: true };
    }
    await db.delete(products).where(eq(products.id, id));
    return { archived: false };
  });
}

export async function updateStock(variantId: string, stock: number) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const v = await db
      .select({ id: variants.id })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(variants.id, variantId), eq(products.supplierId, supplier.id)));
    if (!v.length) fail("Variação não encontrada.");
    const s = Math.max(-100000, Math.min(10_000_000, Math.round(stock)));
    await db.update(variants).set({ stock: s }).where(eq(variants.id, variantId));
    return { stock: s };
  });
}

export async function saveCategory(input: { id?: string; name: string }) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const name = z.string().trim().min(1, "Informe o nome").max(60).parse(input.name);
    if (input.id) {
      await db.update(categories).set({ name }).where(and(eq(categories.id, input.id), eq(categories.supplierId, supplier.id)));
      return { id: input.id };
    }
    const [c] = await db.insert(categories).values({ supplierId: supplier.id, name }).returning({ id: categories.id });
    return { id: c.id };
  }, "Categoria salva");
}

export async function deleteCategory(id: string) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    await db.delete(categories).where(and(eq(categories.id, id), eq(categories.supplierId, supplier.id)));
  }, "Categoria removida");
}
