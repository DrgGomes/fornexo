/**
 * Gera URL de imagem redimensionada e comprimida (WebP) via CDN de imagens wsrv.nl.
 * Fotos originais de fornecedores costumam ter varios MB; a miniatura cai para poucos KB.
 */
export function optimizedImage(srcIn: string | null | undefined, width: number, opts?: { height?: number; fit?: "cover" | "inside" }) {
  let src = srcIn;
  if (!src) return "";
  if (!/^https?:\/\//.test(src)) return src;
  if (src.includes("wsrv.nl")) {
    // link ja convertido (ex.: JPG de importacao): redimensiona a partir da foto original
    try {
      const inner = new URL(src).searchParams.get("url");
      if (inner) src = inner;
      else return src;
    } catch {
      return src;
    }
  }
  const w = Math.round(width);
  const h = Math.round(opts?.height ?? width);
  const fit = opts?.fit ?? "cover";
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${w}&h=${h}&fit=${fit}&output=webp&q=80&we&il`;
}
