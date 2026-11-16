import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, resellers, suppliers, users } from "@/db";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession, type SessionPayload } from "./session-token";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function startSession(user: { id: string; role: SessionPayload["role"]; sessionVersion?: number }) {
  const token = await signSession({ sub: user.id, role: user.role, v: user.sessionVersion ?? 1 });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

const getSession = cache(async () => {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
});

type UserRow = typeof users.$inferSelect;
export type SupplierRow = typeof suppliers.$inferSelect;
export type ResellerRow = typeof resellers.$inferSelect;

function validUser(u: UserRow | null | undefined, payload: SessionPayload): u is UserRow {
  return !!u && u.active && u.sessionVersion === (payload.v ?? 1);
}

export const getCurrentUser = cache(async () => {
  const payload = await getSession();
  if (!payload) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  return validUser(user, payload) ? user : null;
});

export function supplierAccess(s: SupplierRow): { ok: boolean; reason?: string; daysLeft?: number } {
  const now = Date.now();
  if (s.status === "BLOCKED") return { ok: false, reason: "Conta bloqueada pelo administrador." };
  if (s.status === "TRIAL" && s.trialEndsAt) {
    const left = Math.ceil((s.trialEndsAt.getTime() - now) / 86400000);
    if (left < 0) return { ok: false, reason: "Seu período de teste terminou." };
    return { ok: true, daysLeft: left };
  }
  if (s.status === "ACTIVE" && s.paidUntil) {
    const grace = s.paidUntil.getTime() + 5 * 86400000;
    if (grace < now) return { ok: false, reason: "Assinatura vencida." };
  }
  return { ok: true };
}

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
});

export const requireAdmin = cache(async () => {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/entrar");
  return user;
});

/** Usuario + fornecedor em uma unica consulta. */
export const requireSupplier = cache(async () => {
  const payload = await getSession();
  if (!payload || payload.role !== "SUPPLIER") redirect("/entrar");
  const [row] = await db
    .select({ user: users, supplier: suppliers })
    .from(users)
    .innerJoin(suppliers, eq(suppliers.id, users.supplierId))
    .where(eq(users.id, payload.sub))
    .limit(1);
  if (!row || !validUser(row.user, payload) || row.user.role !== "SUPPLIER") redirect("/entrar");
  const access = supplierAccess(row.supplier);
  if (!access.ok) redirect("/bloqueado");
  return { user: row.user, supplier: row.supplier, access };
});

/** Usuario + revendedor + fornecedor em uma unica consulta. */
export const requireReseller = cache(async () => {
  const payload = await getSession();
  if (!payload || payload.role !== "RESELLER") redirect("/entrar");
  const [row] = await db
    .select({ user: users, reseller: resellers, supplier: suppliers })
    .from(users)
    .innerJoin(resellers, eq(resellers.id, users.resellerId))
    .innerJoin(suppliers, eq(suppliers.id, resellers.supplierId))
    .where(eq(users.id, payload.sub))
    .limit(1);
  if (!row || !validUser(row.user, payload) || row.user.role !== "RESELLER") redirect("/entrar");
  if (row.reseller.status !== "ACTIVE") redirect("/aguardando");
  if (!supplierAccess(row.supplier).ok) redirect("/bloqueado");
  return { user: row.user, reseller: row.reseller, supplier: row.supplier };
});
