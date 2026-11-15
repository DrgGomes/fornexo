import { and, asc, eq, inArray } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { db, files, orders } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { readFileBytes } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE_W = 283.46; // 100mm
const PAGE_H = 425.2; // 150mm

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPPLIER" || !user.supplierId) return new Response("Não autorizado", { status: 401 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 200);
  if (!ids.length) return new Response("Nenhum pedido selecionado", { status: 400 });

  const rows = await db
    .select({ number: orders.number, file: files })
    .from(orders)
    .innerJoin(files, eq(files.id, orders.labelFileId))
    .where(and(eq(orders.supplierId, user.supplierId), inArray(orders.id, ids)))
    .orderBy(asc(orders.number));

  if (!rows.length) {
    return new Response(
      `<html><body style="font-family:system-ui;padding:40px;text-align:center"><h2>Nenhuma etiqueta anexada</h2><p>Os pedidos selecionados ainda não possuem etiqueta.</p></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const out = await PDFDocument.create();
  for (const r of rows) {
    try {
      const bytes = await readFileBytes(r.file);
      if (r.file.mimeType === "application/pdf") {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else {
        const img = r.file.mimeType === "image/png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const page = out.addPage([PAGE_W, PAGE_H]);
        const scale = Math.min(PAGE_W / img.width, PAGE_H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: (PAGE_W - w) / 2, y: (PAGE_H - h) / 2, width: w, height: h });
      }
    } catch (e) {
      console.error("label merge failed", r.number, e);
    }
  }
  const pdf = await out.save();
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="etiquetas-${rows.length}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
