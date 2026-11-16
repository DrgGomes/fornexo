import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { orderEvents, orderItems, orders, products, suppliers, transactions, variants, type OrderStatus, type Tx } from "@/db";
import { AppError } from "./action";
import { ORDER_STATUS } from "./constants";
import { orderCode } from "./format";
import { notify } from "./notify";
import { applyWallet, tryPayOrder } from "./wallet";

export type OrderLine = { variantId: string; quantity: number };

export async function createOrderTx(
  tx: Tx,
  input: {
    supplierId: string;
    resellerId: string;
    handlingFee: number;
    lines: OrderLine[];
    marketplace: string;
    externalOrderId?: string | null;
    customerName?: string | null;
    notes?: string | null;
    labelFileId?: string | null;
    actorName: string;
  },
) {
  const merged = new Map<string, number>();
  for (const l of input.lines) {
    const q = Math.floor(l.quantity);
    if (q <= 0) continue;
    merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + q);
  }
  if (merged.size === 0) throw new AppError("Adicione ao menos um item.");

  const rows = await tx
    .select({ v: variants, p: products })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(inArray(variants.id, [...merged.keys()]), eq(products.supplierId, input.supplierId)));
  if (rows.length !== merged.size) throw new AppError("Algum produto não está mais disponível.");

  let subtotal = 0;
  let itemsCost = 0;
  const items: (typeof orderItems.$inferInsert)[] = [];
  for (const { v, p } of rows) {
    if (p.status !== "ACTIVE") throw new AppError(`"${p.name}" não está disponível.`);
    const qty = merged.get(v.id)!;
    const [ok] = await tx
      .update(variants)
      .set({ stock: sql`${variants.stock} - ${qty}` })
      .where(and(eq(variants.id, v.id), sql`${variants.stock} >= ${qty}`))
      .returning({ id: variants.id });
    if (!ok) throw new AppError(`Estoque insuficiente: ${p.name}${p.hasVariants ? ` (${v.name})` : ""}. Disponível: ${v.stock}.`);
    const unit = v.price ?? p.price;
    const unitCost = p.costPrice ?? 0;
    subtotal += unit * qty;
    itemsCost += unitCost * qty;
    items.push({
      orderId: "",
      productId: p.id,
      variantId: v.id,
      productName: p.name,
      variantName: p.hasVariants ? v.name : null,
      sku: v.sku,
      imageUrl: v.imageUrl || p.images[0] || null,
      unitPrice: unit,
      unitCost,
      quantity: qty,
      total: unit * qty,
    });
  }

  const [seq] = await tx
    .update(suppliers)
    .set({ orderSeq: sql`${suppliers.orderSeq} + 1` })
    .where(eq(suppliers.id, input.supplierId))
    .returning({ n: suppliers.orderSeq });

  const total = subtotal + input.handlingFee;
  const [order] = await tx
    .insert(orders)
    .values({
      supplierId: input.supplierId,
      resellerId: input.resellerId,
      number: seq.n,
      status: "AWAITING_PAYMENT",
      marketplace: input.marketplace,
      externalOrderId: input.externalOrderId || null,
      customerName: input.customerName || null,
      notes: input.notes || null,
      labelFileId: input.labelFileId || null,
      subtotal,
      handlingFee: input.handlingFee,
      total,
      itemsCost,
    })
    .returning();

  await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: order.id })));
  await tx.insert(orderEvents).values({ orderId: order.id, status: "AWAITING_PAYMENT", message: "Pedido criado", actorName: input.actorName });

  const paid = await tryPayOrder(tx, order, input.actorName);
  await notify(
    {
      supplierId: input.supplierId,
      toSupplier: true,
      title: `Novo pedido #${orderCode(order.number)}`,
      body: paid ? "Pago com saldo, pronto para separar" : "Aguardando pagamento do revendedor",
      href: `/f/pedidos/${order.id}`,
    },
    tx,
  );
  return { id: order.id, number: order.number, paid, total };
}

async function restock(tx: Tx, orderId: string) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const it of items) {
    if (!it.variantId) continue;
    await tx.update(variants).set({ stock: sql`${variants.stock} + ${it.quantity}` }).where(eq(variants.id, it.variantId));
  }
}

type OrderRow = typeof orders.$inferSelect;

export async function cancelOrderTx(tx: Tx, order: OrderRow, opts: { reason: string; actorName: string; bySupplier: boolean; allowedFrom?: OrderStatus[] }) {
  const allowed: OrderStatus[] = opts.allowedFrom ?? ["AWAITING_PAYMENT", "CONFIRMED", "PICKING", "PICKED", "PACKED"];
  // UPDATE condicional: so um cancelamento vence, mesmo com cliques simultaneos
  const [prev] = await tx
    .update(orders)
    .set({ status: "CANCELED", canceledAt: new Date(), cancelReason: opts.reason || null, paid: false })
    .where(and(eq(orders.id, order.id), inArray(orders.status, allowed)))
    .returning({ id: orders.id });
  if (!prev) {
    const cur = await tx.query.orders.findFirst({ where: eq(orders.id, order.id), columns: { status: true } });
    if (cur?.status === "CANCELED") throw new AppError("Pedido já está cancelado.");
    if (cur?.status === "SHIPPED" || cur?.status === "DELIVERED") throw new AppError("Pedido já enviado. Use devolução.");
    throw new AppError("O pedido mudou de status e não pode mais ser cancelado por aqui.");
  }
  // estado anterior confiavel: lido dentro da transacao, antes do update (linha ja travada)
  await restock(tx, order.id);
  const wasPaid = await tx.query.transactions.findFirst({
    where: and(eq(transactions.orderId, order.id), eq(transactions.type, "ORDER_PAYMENT")),
    columns: { id: true },
  });
  const alreadyRefunded = await tx.query.transactions.findFirst({
    where: and(eq(transactions.orderId, order.id), eq(transactions.type, "REFUND")),
    columns: { id: true },
  });
  const refund = !!wasPaid && !alreadyRefunded;
  if (refund) {
    await applyWallet(tx, {
      supplierId: order.supplierId,
      resellerId: order.resellerId,
      type: "REFUND",
      amount: order.total,
      description: `Estorno do pedido #${orderCode(order.number)} (cancelado)`,
      orderId: order.id,
      createdBy: opts.actorName,
    });
  }
  await tx.insert(orderEvents).values({
    orderId: order.id,
    status: "CANCELED",
    message: `Pedido cancelado${opts.reason ? `: ${opts.reason}` : ""}${refund ? ". Valor estornado para o saldo." : ""}`,
    actorName: opts.actorName,
  });
  await notify(
    opts.bySupplier
      ? {
          supplierId: order.supplierId,
          resellerId: order.resellerId,
          toSupplier: false,
          title: `Pedido #${orderCode(order.number)} cancelado`,
          body: opts.reason || (refund ? "Valor estornado para seu saldo" : undefined),
          href: `/r/pedidos/${order.id}`,
        }
      : {
          supplierId: order.supplierId,
          toSupplier: true,
          title: `Pedido #${orderCode(order.number)} cancelado pelo revendedor`,
          body: opts.reason || undefined,
          href: `/f/pedidos/${order.id}`,
        },
    tx,
  );
}

export async function setOrderStatusTx(tx: Tx, order: OrderRow, to: OrderStatus, actorName: string) {
  if (to === "CANCELED") throw new AppError("Use a ação de cancelar.");
  if (to === "AWAITING_PAYMENT") throw new AppError("Status inválido.");
  if (order.status === "CANCELED") throw new AppError("Pedido cancelado não pode mudar de status.");
  if (!order.paid) throw new AppError("Pedido aguardando pagamento. Marque como pago antes de avançar.");
  if (order.status === to) return { changed: false };
  const [upd] = await tx
    .update(orders)
    .set({ status: to, shippedAt: to === "SHIPPED" ? new Date() : order.shippedAt })
    .where(and(eq(orders.id, order.id), ne(orders.status, "CANCELED"), eq(orders.paid, true)))
    .returning({ id: orders.id });
  if (!upd) throw new AppError("O pedido foi cancelado ou não está pago.");
  await tx.insert(orderEvents).values({ orderId: order.id, status: to, message: ORDER_STATUS[to].label, actorName });
  await notify(
    {
      supplierId: order.supplierId,
      resellerId: order.resellerId,
      toSupplier: false,
      title: `Pedido #${orderCode(order.number)}: ${ORDER_STATUS[to].label}`,
      body: to === "SHIPPED" && order.trackingCode ? `Rastreio: ${order.trackingCode}` : undefined,
      href: `/r/pedidos/${order.id}`,
    },
    tx,
  );
  return { changed: true };
}

/** Marca como pago sem debitar saldo (pagamento recebido por fora). */
export async function markPaidManuallyTx(tx: Tx, order: OrderRow, actorName: string) {
  const [upd] = await tx
    .update(orders)
    .set({ paid: true, paidAt: new Date(), status: "CONFIRMED" })
    .where(and(eq(orders.id, order.id), eq(orders.paid, false), ne(orders.status, "CANCELED")))
    .returning({ id: orders.id });
  if (!upd) throw new AppError("Pedido já está pago ou foi cancelado.");
  await tx.insert(orderEvents).values({ orderId: order.id, status: "CONFIRMED", message: "Pagamento confirmado manualmente pelo fornecedor", actorName });
  await notify(
    {
      supplierId: order.supplierId,
      resellerId: order.resellerId,
      toSupplier: false,
      title: `Pedido #${orderCode(order.number)} confirmado`,
      href: `/r/pedidos/${order.id}`,
    },
    tx,
  );
}
