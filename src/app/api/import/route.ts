import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, importedProducts } from "@/db";
import { CORS_HEADERS, json, supplierFromToken } from "@/lib/import-auth";
import { IMPORT_SOURCES, normalizeSourceUrl, priceToCents, processImportImages } from "@/lib/importer";
import { notify } from "@/lib/notify";
import { attemptsSince, recordAttempt } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const str = (max: number) => z.string().trim().max(max);

const schema = z.object({
  source: z.enum(IMPORT_SOURCES),
  url: z.string().trim().max(2000).refine((u) => /^https:\/\/[^\s]+$/i.test(u), "Endereço do anúncio inválido"),
  title: str(300).min(2, "Título não encontrado no anúncio"),
  description: str(30000).optional().default(""),
  price: z.union([z.number(), z.string().max(40)]).optional().nullable(),
  images: z.array(z.string().max(2000)).max(60).default([]),
  attributes: z
    .array(z.object({ name: str(120).min(1), value: str(500).min(1) }))
    .max(80)
    .default([]),
  variations: z
    .array(z.object({ name: str(60).min(1), values: z.array(str(120).min(1)).min(1).max(60) }))
    .max(3)
    .default([]),
  brand: str(120).optional().nullable(),
  sku: str(120).optional().nullable(),
  gtin: str(40).optional().nullable(),
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const r = await supplierFromToken(req);
  if (r.error) return r.error;
  const s = r.supplier;

  if (Number(req.headers.get("content-length") ?? 0) > 600_000) return json({ error: "Anúncio grande demais." }, 413);
  const key = `import:${s.id}`;
  if ((await attemptsSince(key, 60)) >= 300) return json({ error: "Limite de importações por hora atingido. Tente mais tarde." }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Dados inválidos." }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, 400);
  const d = parsed.data;

  const images = processImportImages(d.images);
  if (!images.length) return json({ error: "Nenhuma foto encontrada. Role a página até as fotos carregarem e tente de novo." }, 400);

  const values = {
    source: d.source,
    sourceUrl: normalizeSourceUrl(d.url),
    title: d.title,
    description: d.description ?? "",
    price: priceToCents(d.price ?? null),
    images,
    attributes: dedupeAttrs(d.attributes),
    variations: d.variations.map((v) => ({ name: v.name, values: [...new Set(v.values)] })),
    brand: d.brand || null,
    sku: d.sku || null,
    gtin: d.gtin || null,
  };

  const existing = await db.query.importedProducts.findFirst({
    where: and(eq(importedProducts.supplierId, s.id), eq(importedProducts.sourceUrl, values.sourceUrl)),
    columns: { id: true, status: true },
  });

  const [row] = await db
    .insert(importedProducts)
    .values({ ...values, supplierId: s.id })
    .onConflictDoUpdate({
      target: [importedProducts.supplierId, importedProducts.sourceUrl],
      set: { ...values, status: sql`case when ${importedProducts.status} = 'CONVERTED' then 'CONVERTED'::import_status else 'PENDING'::import_status end`, updatedAt: new Date() },
    })
    .returning({ id: importedProducts.id, status: importedProducts.status });
  await recordAttempt(key);
  if (!existing) {
    await notify({ supplierId: s.id, toSupplier: true, title: "Novo anúncio importado", body: values.title.slice(0, 120), href: "/f/importados" });
  }

  return json({
    ok: true,
    id: row.id,
    images: images.length,
    updated: !!existing,
    alreadyRegistered: row.status === "CONVERTED",
    title: values.title,
  });
}

function dedupeAttrs(list: { name: string; value: string }[]) {
  const seen = new Set<string>();
  return list.filter((a) => {
    const k = a.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
