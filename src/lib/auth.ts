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

export async function startSession(user: { id: string; role: SessionPayload["role"] }) {
  const token = await signSession({ sub: user.id, role: user.role });
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

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const payload = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  if (!user || !user.active) return null;
  return user;
});

export type SupplierRow = typeof suppliers.$inferSelect;
export type ResellerRow = typeof resellers.$inferSelect;

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

export const requireSupplier = cache(async () => {
  const user = await requireUser();
  if (user.role !== "SUPPLIER" || !user.supplierId) redirect("/entrar");
  const supplier = await db.query.suppliers.findFirst({ where: eq(suppliers.id, user.supplierId) });
  if (!supplier) redirect("/entrar");
  const access = supplierAccess(supplier);
  if (!access.ok) redirect("/bloqueado");
  return { user, supplier, access };
});

export const requireReseller = cache(async () => {
  const user = await requireUser();
  if (user.role !== "RESELLER" || !user.resellerId) redirect("/entrar");
  const reseller = await db.query.resellers.findFirst({ where: eq(resellers.id, user.resellerId) });
  if (!reseller) redirect("/entrar");
  if (reseller.status !== "ACTIVE") redirect("/aguardando");
  const supplier = await db.query.suppliers.findFirst({ where: eq(suppliers.id, reseller.supplierId) });
  if (!supplier) redirect("/entrar");
  if (!supplierAccess(supplier).ok) redirect("/bloqueado");
  return { user, reseller, supplier };
});
