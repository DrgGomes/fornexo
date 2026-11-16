import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { authAttempts, db } from "@/db";

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export async function attemptsSince(key: string, minutes: number) {
  const [r] = await db
    .select({ n: count() })
    .from(authAttempts)
    .where(and(eq(authAttempts.key, key), gt(authAttempts.createdAt, new Date(Date.now() - minutes * 60000))));
  return r.n;
}

export async function recordAttempt(...keys: string[]) {
  await db.insert(authAttempts).values(keys.map((key) => ({ key })));
  if (Math.random() < 0.02) await db.delete(authAttempts).where(lt(authAttempts.createdAt, new Date(Date.now() - 86400000)));
}

export async function clearAttempts(key: string) {
  await db.delete(authAttempts).where(eq(authAttempts.key, key));
}
