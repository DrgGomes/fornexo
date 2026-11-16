import "server-only";
import { headers } from "next/headers";

/** Caminho base das paginas publicas: vazio no dominio proprio do fornecedor, /v/slug no endereco da plataforma. */
export async function showcaseBase(slug: string) {
  const h = await headers();
  return h.get("x-fx-domain-slug") === slug ? "" : `/v/${slug}`;
}

/** Link publico de cadastro do fornecedor (dominio proprio quando ativo). */
export function publicLandingUrl(s: { slug: string; customDomain: string | null; customDomainStatus: string | null; customDomainEnabled: boolean }, origin: string) {
  if (s.customDomainEnabled && s.customDomain && s.customDomainStatus === "ACTIVE") return `https://${s.customDomain}/cadastro`;
  return `${origin}/v/${s.slug}/cadastro`;
}
