/**
 * Gera URL de imagem redimensionada e comprimida (WebP) via CDN de imagens wsrv.nl.
 * Fotos originais de fornecedores costumam ter varios MB; a miniatura cai para poucos KB.
 */
export function optimizedImage(src: string | null | undefined, width: number, opts?: { height?: number; fit?: "cover" | "inside" }) {
  if (!src) return "";
  if (!/^https?:\/\//.test(src) || src.includes("wsrv.nl")) return src;
  const w = Math.round(width);
  const h = Math.round(opts?.height ?? width);
  const fit = opts?.fit ?? "cover";
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${w}&h=${h}&fit=${fit}&output=webp&q=80&we&il`;
}
