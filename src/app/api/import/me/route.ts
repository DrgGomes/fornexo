import { CORS_HEADERS, json, supplierFromToken } from "@/lib/import-auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const r = await supplierFromToken(req);
  if (r.error) return r.error;
  return json({ ok: true, supplier: r.supplier.name });
}
