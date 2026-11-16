import "server-only";
import { headers } from "next/headers";
import { getShowcaseSupplier } from "@/lib/showcase";

/** Marca do fornecedor quando a pagina e aberta no dominio proprio dele. */
export async function domainBrand() {
  const slug = (await headers()).get("x-fx-domain-slug");
  if (!slug) return null;
  const s = await getShowcaseSupplier(slug);
  if (!s) return null;
  return { slug: s.slug, name: s.name, logoUrl: s.logoUrl, color: s.primaryColor, description: s.description };
}
