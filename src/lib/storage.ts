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
