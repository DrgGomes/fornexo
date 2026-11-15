import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const e = process.env;
const raw = e.DATABASE_URL_UNPOOLED || e.POSTGRES_URL_NON_POOLING || e.DATABASE_URL || e.POSTGRES_URL;
if (!raw) {
  console.warn("[migrate] Nenhuma URL de banco encontrada, pulando migracoes.");
  process.exit(0);
}
const local = /localhost|127\.0\.0\.1/.test(raw);
const u = new URL(raw);
for (const k of ["sslmode", "supa", "pgbouncer", "channel_binding"]) u.searchParams.delete(k);
const pool = new pg.Pool({ connectionString: u.toString(), max: 1, ssl: local ? undefined : { rejectUnauthorized: false } });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Banco atualizado.");
} catch (err) {
  console.error("[migrate] Falhou:", err);
  process.exit(1);
} finally {
  await pool.end();
}
