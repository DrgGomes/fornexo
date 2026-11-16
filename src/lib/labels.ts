import "server-only";
import { PDFDocument } from "pdf-lib";
import { ACCEPTED_UPLOAD, MAX_LABEL_FILES, MAX_LABELS_TOTAL_BYTES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { AppError } from "@/lib/action";
import { saveUpload } from "@/lib/storage";

/** Recebe ate 5 etiquetas (PDF ou imagem) e salva um unico PDF, pronto para imprimir. */
export async function saveLabels(input: FormDataEntryValue[], opts: { supplierId: string; ownerResellerId: string }) {
  const files = input.filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return null;
  if (files.length > MAX_LABEL_FILES) throw new AppError(`Envie no máximo ${MAX_LABEL_FILES} etiquetas. Para mais, junte os PDFs em um só.`);
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_LABELS_TOTAL_BYTES) throw new AppError("As etiquetas somam mais de 4 MB. Junte e comprima os PDFs em um só.");
  for (const f of files) {
    if (f.size > MAX_UPLOAD_BYTES) throw new AppError(`${f.name}: arquivo maior que 4 MB.`);
    if (!ACCEPTED_UPLOAD.includes(f.type)) throw new AppError(`${f.name}: envie PDF, PNG ou JPG.`);
  }
  const opt = { ...opts, folder: "labels" };
  if (files.length === 1) return saveUpload(files[0], opt);

  const out = await PDFDocument.create();
  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    try {
      if (f.type === "application/pdf") {
        if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) throw new Error("bad");
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else if (f.type === "image/png" || f.type === "image/jpeg") {
        const img = f.type === "image/png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      } else {
        throw new AppError(`${f.name}: para juntar várias etiquetas use PDF, PNG ou JPG.`);
      }
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(`Não consegui ler ${f.name}. Junte os PDFs em um só e anexe novamente.`);
    }
  }
  const merged = await out.save();
  const file = new File([Buffer.from(merged)], `etiquetas-${files.length}.pdf`, { type: "application/pdf" });
  return saveUpload(file, opt);
}
