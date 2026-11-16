import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, importedProducts } from "@/db";
import { CORS_HEADERS, json, supplierFromToken } from "@/lib/import-auth";
import { IMPORT_SOURCES, normalizeSourceUrl, priceToCents, processImportImages } from "@/lib/importer";
import { notify } from "@/lib/notify";
import { attemptsSince, recordAttempt } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Texto aparado e cortado no limite (nunca recusa a importacao por tamanho). */
const str = (max: number) => z.string().transform((v) => v.trim().slice(0, max));

const schema = z.object({
  source: z.enum(IMPORT_SOURCES),
  // links do TikTok/Shopee trazem muitos parametros de rastreio: aceitamos longo e limpamos depois
  url: z.string().trim().max(50000).refine((u) => /^https:\/\/[^\s]+$/i.test(u), "Endereço do anúncio inválido"),
  title: str(300).refine((v) => v.length >= 2, "Título não encontrado no anúncio"),
  description: str(30000).optional().default(""),
  price: z.union([z.number(), z.string().transform((v) => v.slice(0, 40))]).optional().nullable(),
  // fotos com link longo demais sao ignoradas (nao derrubam a importacao)
  images: z.array(z.string()).max(200).default([]),
  attributes: z
    .array(z.object({ name: str(120), value: str(500) }))
    .default([])
    .transform((a) => a.filter((x) => x.name && x.value).slice(0, 80)),
  variations: z
    .array(z.object({ name: str(60), values: z.array(str(120)) }))
    .default([])
    .transform((a) =>
      a
        .map((v) => ({ name: v.name, values: v.values.filter(Boolean).slice(0, 60) }))
        .filter((v) => v.name && v.values.length)
        .slice(0, 3),
    ),
  brand: str(120).optional().nullable(),
  sku: str(120).optional().nullable(),
  gtin: str(40).optional().nullable(),
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    return await handleImport(req);
  } catch (e) {
    console.error("[import] erro", e);
    return json({ error: "O sistema não conseguiu salvar agora. Tente de novo em alguns segundos." }, 500);
  }
}

async function handleImport(req: Request) {
  const r = await supplierFromToken(req);
  if (r.error) return r.error;
  const s = r.supplier;

  if (Number(req.headers.get("content-length") ?? 0) > 3_000_000) return json({ error: "Anúncio grande demais." }, 413);
  const key = `import:${s.id}`;
  if ((await attemptsSince(key, 60)) >= 300) return json({ error: "Limite de importações por hora atingido. Tente mais tarde." }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Dados inválidos." }, 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    console.warn("[import] payload invalido", issue?.path?.join("."), issue?.code);
    return json({ error: friendlyError(issue?.path?.[0]) }, 400);
  }
  const d = parsed.data;
  const sourceUrl = normalizeSourceUrl(d.url).slice(0, 2000);

  const images = processImportImages(d.images.filter((u) => u.length <= 6000));
  if (!images.length) return json({ error: "Nenhuma foto encontrada. Role a página até as fotos carregarem e tente de novo." }, 400);

  const values = {
    source: d.source,
    sourceUrl,
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

function friendlyError(field: unknown) {
  switch (field) {
    case "title":
      return "Não encontrei o título do produto nesta página.";
    case "url":
      return "Endereço do anúncio inválido.";
    case "source":
      return "Site não suportado.";
    default:
      return "Alguns dados do anúncio vieram em formato inesperado. Recarregue a página e tente de novo.";
  }
}
