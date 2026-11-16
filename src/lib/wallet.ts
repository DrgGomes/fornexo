import { and, asc, eq, gte, ne, sql } from "drizzle-orm";
import { orderEvents, orders, resellers, transactions, type Tx } from "@/db";
import { orderCode } from "./format";
import { notify } from "./notify";
import { AppError } from "./action";

type TxInput = {
  supplierId: string;
  resellerId: string;
  type: "DEPOSIT" | "ORDER_PAYMENT" | "REFUND" | "ADJUSTMENT";
  amount: number;
  description: string;
  orderId?: string;
  depositId?: string;
  returnId?: string;
  createdBy?: string;
  allowNegative?: boolean;
};

/** Credita (amount > 0) ou debita (amount < 0) do saldo, gerando lancamento no extrato. */
export async function applyWallet(tx: Tx, t: TxInput) {
  const conds = [eq(resellers.id, t.resellerId), eq(resellers.supplierId, t.supplierId)];
  if (t.amount < 0 && !t.allowNegative) conds.push(gte(resellers.balance, -t.amount));
  const [r] = await tx
    .update(resellers)
    .set({ balance: sql`${resellers.balance} + ${t.amount}` })
    .where(and(...conds))
    .returning({ balance: resellers.balance });
  if (!r) throw new AppError("Saldo insuficiente.");
  await tx.insert(transactions).values({
    supplierId: t.supplierId,
    resellerId: t.resellerId,
    type: t.type,
    amount: t.amount,
    balanceAfter: r.balance,
    description: t.description,
    orderId: t.orderId,
    depositId: t.depositId,
    returnId: t.returnId,
    createdBy: t.createdBy,
  });
  return r.balance;
}

/**
 * Tenta pagar um pedido com o saldo. Retorna true se pago.
 * Seguro contra cliques/requisicoes simultaneas: primeiro "reserva" o pedido (paid=false -> true)
 * com UPDATE condicional; se o debito falhar, desfaz a reserva na mesma transacao.
 */
export async function tryPayOrder(
  tx: Tx,
  order: { id: string; supplierId: string; resellerId: string; total: number; number: number },
  actorName?: string,
) {
  const [claimed] = await tx
    .update(orders)
    .set({ paid: true, paidAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.paid, false), ne(orders.status, "CANCELED")))
    .returning({ status: orders.status, total: orders.total });
  if (!claimed) return false;
  const total = claimed.total;
  const [r] = await tx
    .update(resellers)
    .set({ balance: sql`${resellers.balance} - ${total}` })
    .where(and(eq(resellers.id, order.resellerId), gte(resellers.balance, total)))
    .returning({ balance: resellers.balance });
  if (!r) {
    await tx.update(orders).set({ paid: false, paidAt: null }).where(eq(orders.id, order.id));
    return false;
  }
  await tx.insert(transactions).values({
    supplierId: order.supplierId,
    resellerId: order.resellerId,
    type: "ORDER_PAYMENT",
    amount: -total,
    balanceAfter: r.balance,
    description: `Pedido #${orderCode(order.number)}`,
    orderId: order.id,
  });
  const confirm = claimed.status === "AWAITING_PAYMENT";
  if (confirm) await tx.update(orders).set({ status: "CONFIRMED" }).where(eq(orders.id, order.id));
  await tx.insert(orderEvents).values({
    orderId: order.id,
    status: confirm ? "CONFIRMED" : null,
    message: "Pagamento debitado do saldo. Pedido confirmado.",
    actorName: actorName ?? "Sistema",
  });
  return true;
}

/** Paga pedidos pendentes (mais antigos primeiro) enquanto houver saldo. */
export async function payPendingOrders(tx: Tx, supplierId: string, resellerId: string) {
  const pending = await tx
    .select()
    .from(orders)
    .where(and(eq(orders.resellerId, resellerId), eq(orders.supplierId, supplierId), eq(orders.status, "AWAITING_PAYMENT")))
    .orderBy(asc(orders.createdAt));
  let paidCount = 0;
  for (const o of pending) {
    if (await tryPayOrder(tx, o)) {
      paidCount++;
      await notify(
        { supplierId, toSupplier: true, title: `Pedido #${orderCode(o.number)} pago`, body: "Pronto para separação", href: `/f/pedidos/${o.id}` },
        tx,
      );
    }
  }
  return paidCount;
}
