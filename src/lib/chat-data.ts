import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, messages, orders, products } from "@/db";
import type { ChatMessage } from "@/actions/messages";
import { orderCode } from "./format";

export async function loadConversation(supplierId: string, resellerId: string, meIsSupplier: boolean): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.supplierId, supplierId), eq(messages.resellerId, resellerId)))
    .orderBy(asc(messages.createdAt))
    .limit(500);
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.supplierId, supplierId), eq(messages.resellerId, resellerId), eq(messages.fromSupplier, !meIsSupplier), isNull(messages.readAt)));
  return rows.map((m) => ({ id: m.id, fromSupplier: m.fromSupplier, authorName: m.authorName, body: m.body, createdAt: m.createdAt.toISOString(), productId: m.productId, orderId: m.orderId }));
}

export async function chatContext(supplierId: string, sp: { produto?: string; pedido?: string }) {
  if (sp.produto) {
    const p = await db.query.products.findFirst({ where: and(eq(products.id, sp.produto), eq(products.supplierId, supplierId)), columns: { id: true, name: true, sku: true } });
    if (p) return { productId: p.id, label: `${p.name} (${p.sku})`, draft: `Olá! Tenho uma dúvida sobre o produto ${p.name} (SKU ${p.sku}): ` };
  }
  if (sp.pedido) {
    const o = await db.query.orders.findFirst({ where: and(eq(orders.id, sp.pedido), eq(orders.supplierId, supplierId)), columns: { id: true, number: true } });
    if (o) return { orderId: o.id, label: `Pedido #${orderCode(o.number)}`, draft: `Sobre o pedido #${orderCode(o.number)}: ` };
  }
  return null;
}

export type ConversationRow = { resellerId: string; name: string; body: string; createdAt: string; fromSupplier: boolean; unread: number };

export async function listConversations(supplierId: string): Promise<ConversationRow[]> {
  const res = await db.execute<{ reseller_id: string; body: string; created_at: Date; from_supplier: boolean; name: string; unread: string }>(sql`
    select m.reseller_id, m.body, m.created_at, m.from_supplier, coalesce(r.store_name, r.name) as name,
      (select count(*) from messages x where x.reseller_id = m.reseller_id and x.supplier_id = ${supplierId} and x.from_supplier = false and x.read_at is null) as unread
    from (select distinct on (reseller_id) * from messages where supplier_id = ${supplierId} order by reseller_id, created_at desc) m
    join resellers r on r.id = m.reseller_id
    order by m.created_at desc
    limit 200`);
  return res.rows.map((r) => ({
    resellerId: r.reseller_id,
    name: r.name,
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    fromSupplier: r.from_supplier,
    unread: Number(r.unread),
  }));
}
