/** Resolve a URL do Postgres (Neon, Supabase ou outro) e remove sslmode para controlarmos o SSL. */
export function resolveDbUrl(kind: "pooled" | "direct" = "pooled") {
  const e = process.env;
  const raw =
    kind === "direct"
      ? e.DATABASE_URL_UNPOOLED || e.POSTGRES_URL_NON_POOLING || e.DATABASE_URL || e.POSTGRES_URL
      : e.DATABASE_URL || e.POSTGRES_URL || e.POSTGRES_PRISMA_URL;
  if (!raw) return null;
  const local = /localhost|127\.0\.0\.1/.test(raw);
  try {
    const u = new URL(raw);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("supa");
    u.searchParams.delete("pgbouncer");
    u.searchParams.delete("channel_binding");
    return { url: u.toString(), local };
  } catch {
    return { url: raw, local };
  }
}
