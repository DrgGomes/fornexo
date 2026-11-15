import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const e = process.env;
const candidates = [e.DATABASE_URL_UNPOOLED, e.POSTGRES_URL_NON_POOLING, e.DATABASE_URL, e.POSTGRES_URL].filter(Boolean);
if (!candidates.length) {
  console.warn("[migrate] Nenhuma URL de banco encontrada, pulando migracoes.");
  process.exit(0);
}

function clean(raw) {
  const u = new URL(raw);
  for (const k of ["sslmode", "supa", "pgbouncer", "channel_binding"]) u.searchParams.delete(k);
  return u.toString();
}

let lastErr;
for (const raw of [...new Set(candidates)]) {
  const local = /localhost|127\.0\.0\.1/.test(raw);
  const pool = new pg.Pool({ connectionString: clean(raw), max: 1, connectionTimeoutMillis: 15000, ssl: local ? undefined : { rejectUnauthorized: false } });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("[migrate] Banco atualizado.");
    await pool.end();
    process.exit(0);
  } catch (err) {
    lastErr = err;
    console.warn("[migrate] Tentativa falhou, tentando proxima URL:", err?.cause?.code || err?.code || err?.message);
    await pool.end().catch(() => {});
  }
}
console.error("[migrate] Falhou:", lastErr);
process.exit(1);
