import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import JSZip from "jszip";
import { db, suppliers } from "@/db";
import { getCurrentUser, supplierAccess } from "@/lib/auth";
import { generateImportToken, hashToken } from "@/lib/importer";
import { baseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...(await listFiles(path.join(dir, e.name), `${prefix}${e.name}/`)));
    else out.push(`${prefix}${e.name}`);
  }
  return out;
}

/**
 * Gera a extensao ja conectada a conta do fornecedor (endereco + codigo embutidos).
 * Cada download cria um novo codigo e desconecta copias antigas.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPPLIER" || !user.supplierId) return new Response("Não autorizado", { status: 401 });
  const s = await db.query.suppliers.findFirst({ where: eq(suppliers.id, user.supplierId) });
  if (!s || !supplierAccess(s).ok) return new Response("Conta indisponível", { status: 403 });
  if (!s.importerEnabled) return new Response("Importador não liberado para esta conta", { status: 403 });

  const token = generateImportToken();
  await db.update(suppliers).set({ importTokenHash: hashToken(token), importTokenCreatedAt: new Date() }).where(eq(suppliers.id, s.id));
  const server = await baseUrl();

  const dir = path.join(process.cwd(), "extension");
  const zip = new JSZip();
  const folder = zip.folder("fornexo-importador")!;
  for (const rel of await listFiles(dir)) {
    const buf = await readFile(path.join(dir, rel));
    if (rel === "config.js" || rel === "manifest.json") {
      folder.file(rel, buf.toString("utf8").replaceAll("__FX_SERVER__", server).replaceAll("__FX_TOKEN__", token));
    } else folder.file(rel, buf);
  }
  const out = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new Response(new Uint8Array(out), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="fornexo-importador.zip"',
      "Cache-Control": "no-store",
    },
  });
}
