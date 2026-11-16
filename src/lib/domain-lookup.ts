import { and, eq, inArray } from "drizzle-orm";
import { db, suppliers } from "@/db";

type Hit = { slug: string } | null;
const cache = new Map<string, { v: Hit; at: number }>();
const TTL = 60_000;

/** Hosts do proprio sistema nunca sao tratados como dominio de fornecedor. */
export function isAppHost(host: string) {
  return !host || host.startsWith("localhost") || host.startsWith("127.") || host.endsWith(".vercel.app") || (process.env.APP_HOSTS ?? "fornexo.com.br,www.fornexo.com.br").split(",").includes(host);
}

export async function supplierByDomain(host: string): Promise<Hit> {
  const now = Date.now();
  const c = cache.get(host);
  if (c && now - c.at < TTL) return c.v;
  let v: Hit = null;
  try {
    const row = await db
      .select({ slug: suppliers.slug })
      .from(suppliers)
      .where(and(eq(suppliers.customDomain, host), eq(suppliers.customDomainEnabled, true), inArray(suppliers.customDomainStatus, ["PENDING", "ACTIVE"])))
      .limit(1);
    v = row[0] ?? null;
  } catch {
    return c?.v ?? null;
  }
  if (cache.size > 2000) cache.clear();
  cache.set(host, { v, at: now });
  return v;
}

export function forgetDomain(host: string | null | undefined) {
  if (host) cache.delete(host);
}
