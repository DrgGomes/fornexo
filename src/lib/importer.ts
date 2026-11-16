import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const IMPORT_SOURCES = ["MERCADO_LIVRE", "SHOPEE", "TIKTOK", "TEMU", "OUTRO"] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const SOURCE_LABEL: Record<string, string> = {
  MERCADO_LIVRE: "Mercado Livre",
  SHOPEE: "Shopee",
  TIKTOK: "TikTok Shop",
  TEMU: "Temu",
  OUTRO: "Outro site",
};

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateImportToken() {
  return "fxi_" + randomBytes(24).toString("base64url");
}

/** Normaliza a URL do anuncio (remove rastreadores) para evitar duplicados. */
export function normalizeSourceUrl(raw: string) {
  try {
    const u = new URL(raw);
    u.hash = "";
    const keep = new URLSearchParams();
    for (const k of ["item_id", "shop_id", "goods_id", "product_id"]) if (u.searchParams.get(k)) keep.set(k, u.searchParams.get(k)!);
    u.search = keep.toString();
    return u.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

const JPG_PATH = /\.jpe?g$/i;

/**
 * Converte o link da foto em um link DIRETO em JPG, sem baixar a imagem.
 * 1) Reescreve para a versao JPG nativa do marketplace quando ela existe (Mercado Livre, Temu).
 * 2) Se o link continuar sem .jpg (Shopee, TikTok, WebP...), usa o conversor publico wsrv.nl,
 *    que entrega a mesma foto em JPG por um link direto.
 */
export function toDirectJpg(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  u.protocol = "https:";
  const h = u.hostname;

  if (h.includes("wsrv.nl")) {
    const inner = u.searchParams.get("url");
    return inner ? toDirectJpg(inner) : null;
  }
  if (h.includes("mlstatic.com")) {
    // D_NQ_NP_2X_xxx-MLB...-R.webp  ->  D_NQ_NP_2X_xxx-MLB...-F.jpg (maior resolucao, JPG nativo)
    u.pathname = u.pathname
      .replace(/\/D_Q_NP_/, "/D_NQ_NP_")
      .replace(/\/D_NQ_NP_(?!2X_)/, "/D_NQ_NP_2X_")
      .replace(/-[A-Z]\.(webp|jpe?g|png|avif)$/i, "-F.jpg")
      .replace(/\.(webp|png|avif)$/i, ".jpg");
    u.search = "";
  } else if (h.includes("kwcdn.com")) {
    // Temu: a query faz a conversao para webp; o arquivo original costuma ser .jpg
    u.search = "";
  } else if (h.includes("susercontent.com") || h.includes("shopee")) {
    // Shopee: remove sufixo de miniatura (_tn) e de redimensionamento (@resize_...)
    u.pathname = u.pathname.replace(/@[^/]*$/, "").replace(/_tn$/, "");
    u.search = "";
  }

  const clean = u.toString();
  if (JPG_PATH.test(u.pathname)) return clean;
  return `https://wsrv.nl/?url=${encodeURIComponent(clean)}&output=jpg&q=90`;
}

export function processImportImages(urls: string[]) {
  const out: string[] = [];
  for (const raw of urls) {
    const jpg = toDirectJpg(raw);
    if (jpg && !out.includes(jpg)) out.push(jpg);
    if (out.length >= 20) break;
  }
  return out;
}

/** Converte "R$ 1.234,56" / "1234.56" / numero em centavos. */
export function priceToCents(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v > 0 && v < 100_000 ? Math.round(v * 100) : null;
  if (typeof v !== "string") return null;
  const s = v.replace(/[^\d.,]/g, "");
  if (!s) return null;
  let n: number;
  if (s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")) n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) n = parseFloat(s.replace(/\./g, ""));
  else n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 && n < 100_000 ? Math.round(n * 100) : null;
}
