"use server";

import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { db, messages, orders, products, resellers } from "@/db";
import { fail, run } from "@/lib/action";
import { getCurrentUser } from "@/lib/auth";

export type ChatMessage = {
  id: string;
  fromSupplier: boolean;
  authorName: string;
  body: string;
  createdAt: string;
  productId: string | null;
  orderId: string | null;
};

async function scope(resellerId?: string) {
  const user = await getCurrentUser();
  if (!user) fail("Sessão expirada.");
  if (user.role === "SUPPLIER" && user.supplierId) {
    if (!resellerId) fail("Conversa inválida.");
    const r = await db.query.resellers.findFirst({ where: and(eq(resellers.id, resellerId), eq(resellers.supplierId, user.supplierId)) });
    if (!r) fail("Revendedor não encontrado.");
    return { user, supplierId: user.supplierId, resellerId: r.id, fromSupplier: true };
  }
  if (user.role === "RESELLER" && user.resellerId) {
    const r = await db.query.resellers.findFirst({ where: eq(resellers.id, user.resellerId) });
    if (!r || r.status !== "ACTIVE") fail("Acesso indisponível.");
    return { user, supplierId: r.supplierId, resellerId: r.id, fromSupplier: false };
  }
  fail("Sem permissão.");
}

function toChat(m: typeof messages.$inferSelect): ChatMessage {
  return { id: m.id, fromSupplier: m.fromSupplier, authorName: m.authorName, body: m.body, createdAt: m.createdAt.toISOString(), productId: m.productId, orderId: m.orderId };
}

export async function sendMessage(input: { resellerId?: string; body: string; productId?: string | null; orderId?: string | null }) {
  return run(async () => {
    const s = await scope(input.resellerId);
    const body = input.body.trim().slice(0, 4000);
    if (!body) fail("Escreva uma mensagem.");
    let productId: string | null = null;
    let orderId: string | null = null;
    if (input.productId) {
      const p = await db.query.products.findFirst({ where: and(eq(products.id, input.productId), eq(products.supplierId, s.supplierId)), columns: { id: true } });
      productId = p?.id ?? null;
    }
    if (input.orderId) {
      const o = await db.query.orders.findFirst({ where: and(eq(orders.id, input.orderId), eq(orders.resellerId, s.resellerId)), columns: { id: true } });
      orderId = o?.id ?? null;
    }
    const [m] = await db
      .insert(messages)
      .values({ supplierId: s.supplierId, resellerId: s.resellerId, fromSupplier: s.fromSupplier, authorName: s.user.name, body, productId, orderId })
      .returning();
    return toChat(m);
  });
}

export async function fetchMessages(input: { resellerId?: string; after?: string }) {
  return run(async () => {
    const s = await scope(input.resellerId);
    const conds = [eq(messages.supplierId, s.supplierId), eq(messages.resellerId, s.resellerId)];
    if (input.after) conds.push(gt(messages.createdAt, new Date(input.after)));
    const rows = await db.select().from(messages).where(and(...conds)).orderBy(asc(messages.createdAt)).limit(300);
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.supplierId, s.supplierId), eq(messages.resellerId, s.resellerId), eq(messages.fromSupplier, !s.fromSupplier), isNull(messages.readAt)));
    return rows.map(toChat);
  });
}
