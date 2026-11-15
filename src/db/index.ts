import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { resolveDbUrl } from "./url";

const globalForDb = globalThis as unknown as { pool?: Pool };

function makePool() {
  const r = resolveDbUrl("pooled");
  if (!r) throw new Error("DATABASE_URL nao configurada");
  const { url, local } = r;
  return new Pool({
    connectionString: url,
    max: local ? 10 : 5,
    ssl: local ? undefined : { rejectUnauthorized: false },
    idleTimeoutMillis: 10_000,
  });
}

const pool = globalForDb.pool ?? makePool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export * from "./schema";
