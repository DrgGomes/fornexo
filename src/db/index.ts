import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { resolveDbUrl } from "./url";

function makeDb() {
  const r = resolveDbUrl("pooled");
  if (!r) throw new Error("DATABASE_URL nao configurada");
  const pool = new Pool({
    connectionString: r.url,
    max: r.local ? 10 : 5,
    ssl: r.local ? undefined : { rejectUnauthorized: false },
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  });
  // Em funcoes Fluid da Vercel, fecha conexoes ociosas com seguranca antes de suspender
  if (process.env.VERCEL) attachDatabasePool(pool);
  return drizzle(pool, { schema });
}

type Database = ReturnType<typeof makeDb>;
const g = globalThis as unknown as { __fxDb?: Database };

function getDb(): Database {
  if (!g.__fxDb) g.__fxDb = makeDb();
  return g.__fxDb;
}

/** Conexao criada sob demanda (o build nao precisa do banco). */
export const db = new Proxy({} as Database, {
  get(_t, prop) {
    const real = getDb();
    const v = Reflect.get(real, prop, real);
    return typeof v === "function" ? v.bind(real) : v;
  },
});

export type DB = Database;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export * from "./schema";
