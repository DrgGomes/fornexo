import "server-only";
import { put } from "@vercel/blob";
import { db, files } from "@/db";
import { ACCEPTED_UPLOAD, MAX_UPLOAD_BYTES } from "./constants";
import { AppError } from "./action";
import { newId } from "./id";

export async function saveUpload(file: File, opts: { supplierId: string; ownerResellerId?: string | null; folder: string }) {
  if (!file || typeof file === "string" || file.size === 0) throw new AppError("Arquivo inválido.");
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("Arquivo maior que 4 MB.");
  const type = file.type || "application/octet-stream";
  if (!ACCEPTED_UPLOAD.includes(type)) throw new AppError("Envie PDF, PNG, JPG ou WEBP.");
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesSignature(type, head)) throw new AppError("O conteúdo do arquivo não corresponde ao tipo informado.");
  const safeName = (file.name || "arquivo").replace(/[^\w.\-]+/g, "_").slice(-80);
  let url: string | null = null;
  let data: Buffer | null = null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${opts.supplierId}/${opts.folder}/${newId(24)}-${safeName}`, file, {
      access: "public",
      contentType: type,
    });
    url = blob.url;
  } else {
    data = Buffer.from(await file.arrayBuffer());
  }
  const [row] = await db
    .insert(files)
    .values({ supplierId: opts.supplierId, ownerResellerId: opts.ownerResellerId ?? null, name: safeName, mimeType: type, size: file.size, url, data })
    .returning({ id: files.id });
  return row.id;
}

export async function readFileBytes(f: { url: string | null; data: Buffer | null }) {
  if (f.data) return Buffer.from(f.data);
  if (f.url) {
    const res = await fetch(f.url, { cache: "no-store" });
    if (!res.ok) throw new Error("Falha ao ler arquivo");
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Arquivo vazio");
}

/** Confere a assinatura binaria (magic bytes) para impedir arquivos disfarcados. */
function matchesSignature(type: string, b: Uint8Array) {
  const starts = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  switch (type) {
    case "application/pdf":
      return starts(0x25, 0x50, 0x44, 0x46); // %PDF
    case "image/png":
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/jpeg":
      return starts(0xff, 0xd8, 0xff);
    case "image/webp":
      return starts(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    default:
      return false;
  }
}
