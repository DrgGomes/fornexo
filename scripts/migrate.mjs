import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.warn("[migrate] Nenhuma DATABASE_URL encontrada, pulando migracoes.");
  process.exit(0);
}
const local = /localhost|127\.0\.0\.1/.test(url);
const pool = new pg.Pool({ connectionString: url, max: 1, ssl: local ? undefined : { rejectUnauthorized: false } });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("[migrate] Banco atualizado.");
} catch (e) {
  console.error("[migrate] Falhou:", e);
  process.exit(1);
} finally {
  await pool.end();
}
