import { eq } from "drizzle-orm";
import { db, files } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { readFileBytes } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const f = await db.query.files.findFirst({ where: eq(files.id, id) });
  if (!f) return new Response("Arquivo não encontrado", { status: 404 });
  const allowed =
    user.role === "ADMIN" ||
    (user.role === "SUPPLIER" && user.supplierId === f.supplierId) ||
    (user.role === "RESELLER" && !!user.resellerId && user.resellerId === f.ownerResellerId);
  if (!allowed) return new Response("Sem permissão", { status: 403 });
  const bytes = await readFileBytes(f);
  const download = new URL(req.url).searchParams.get("download");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": f.mimeType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      ...(f.mimeType.startsWith("image/") ? { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
