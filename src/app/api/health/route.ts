import { sql } from "drizzle-orm";
import { db } from "@/db";
import { resolveDbUrl } from "@/db/url";

export const dynamic = "force-dynamic";

/** Diagnostico de saude e latencia (nao expoe credenciais). */
export async function GET() {
  const url = resolveDbUrl("pooled");
  let dbRegion: string | null = null;
  try {
    const host = url ? new URL(url.url).hostname : "";
    dbRegion = host.match(/(?:aws-\d+-)?([a-z]{2}-[a-z]+-\d)/)?.[1] ?? (host.includes("neon") ? host.split(".")[1] ?? null : null);
  } catch {}
  const times: number[] = [];
  let ok = true;
  try {
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      await db.execute(sql`select 1`);
      times.push(Math.round(performance.now() - t));
    }
  } catch {
    ok = false;
  }
  return Response.json(
    { ok, fnRegion: process.env.VERCEL_REGION ?? "local", dbRegion, dbMs: times },
    { headers: { "Cache-Control": "no-store" } },
  );
}
