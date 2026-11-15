"use client";

import JSZip from "jszip";

export function proxied(url: string) {
  return `/api/img?u=${encodeURIComponent(url)}`;
}

function extFor(type: string) {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

export async function fetchImage(url: string) {
  const res = await fetch(proxied(url));
  if (!res.ok) throw new Error("Falha ao baixar a imagem");
  return res.blob();
}

export function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}

export function safeFileName(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "produto"
  );
}

/** No celular abre a folha de compartilhamento (salvar na galeria). No PC baixa o arquivo. */
export async function shareOrDownloadImages(urls: string[], baseName: string) {
  const blobs = await Promise.all(urls.map(fetchImage));
  const files = blobs.map((b, i) => new File([b], `${baseName}-${i + 1}.${extFor(b.type)}`, { type: b.type || "image/jpeg" }));
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile && nav.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "aborted";
    }
  }
  files.forEach((f) => saveBlob(f, f.name));
  return "downloaded";
}

export async function downloadZip(urls: string[], baseName: string, onProgress?: (done: number, total: number) => void) {
  const zip = new JSZip();
  let done = 0;
  await Promise.all(
    urls.map(async (u, i) => {
      const b = await fetchImage(u);
      zip.file(`${baseName}-${String(i + 1).padStart(2, "0")}.${extFor(b.type)}`, b);
      onProgress?.(++done, urls.length);
    }),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  saveBlob(blob, `${baseName}-fotos.zip`);
}
