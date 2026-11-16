import { sql } from "drizzle-orm";
import { db, resellers } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { safeFetch } from "@/lib/safe-fetch";

export const dynamic = "force-dynamic";

/** Proxy de imagens de produtos para download (evita bloqueio de CORS). So serve imagens do catalogo do proprio fornecedor. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  let supplierId = user.supplierId;
  if (user.role === "RESELLER" && user.resellerId) {
    const r = await db.query.resellers.findFirst({ where: eq(resellers.id, user.resellerId), columns: { supplierId: true } });
    supplierId = r?.supplierId ?? null;
  }
  const u = new URL(req.url).searchParams.get("u");
  if (!u || !supplierId || !/^https?:\/\//.test(u)) return new Response("URL inválida", { status: 400 });
  const found = await db.execute(sql`
    select 1 from products where supplier_id = ${supplierId} and ${u} = any(images)
    union all
    select 1 from variants v join products p on p.id = v.product_id where p.supplier_id = ${supplierId} and v.image_url = ${u}
    limit 1`);
  if (!found.rows.length) return new Response("Imagem não pertence ao catálogo", { status: 403 });
  let res: Response;
  try {
    res = await safeFetch(u);
  } catch {
    return new Response("Endereço de imagem não permitido", { status: 400 });
  }
  if (!res.ok || !res.body) return new Response("Falha ao baixar imagem", { status: 502 });
  const type = res.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/") || type.includes("svg")) return new Response("Arquivo não é imagem", { status: 415 });
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > 25 * 1024 * 1024) return new Response("Imagem grande demais", { status: 413 });
  return new Response(res.body, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
