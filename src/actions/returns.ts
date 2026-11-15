"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, orderEvents, orderItems, orders, returns, variants } from "@/db";
import { fail, run } from "@/lib/action";
import { requireReseller, requireSupplier } from "@/lib/auth";
import { RETURN_REASONS } from "@/lib/constants";
import { brl, orderCode } from "@/lib/format";
import { notify } from "@/lib/notify";
import { saveUpload } from "@/lib/storage";
import { applyWallet } from "@/lib/wallet";

const itemsSchema = z.array(z.object({ orderItemId: z.string(), quantity: z.number().int().min(1) })).min(1, "Selecione ao menos um item");

export async function createReturn(form: FormData) {
  return run(async () => {
    const { reseller, user } = await requireReseller();
    const orderId = String(form.get("orderId") ?? "");
    const reason = z.enum(RETURN_REASONS as [string, ...string[]]).parse(String(form.get("reason")));
    const details = String(form.get("details") ?? "").slice(0, 3000);
    const items = itemsSchema.parse(JSON.parse(String(form.get("items") ?? "[]")));
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.resellerId, reseller.id)),
      with: { items: true },
    });
    if (!order) fail("Pedido não encontrado.");
    if (!["SHIPPED", "DELIVERED"].includes(order.status)) fail("Só é possível devolver pedidos já enviados. Para os outros, cancele o pedido.");

    const previous = await db.query.returns.findMany({ where: and(eq(returns.orderId, order.id), ne(returns.status, "REJECTED")) });
    const already = new Map<string, number>();
    for (const r of previous) for (const it of r.items) already.set(it.orderItemId, (already.get(it.orderItemId) ?? 0) + it.quantity);

    let amount = 0;
    for (const it of items) {
      const oi = order.items.find((x) => x.id === it.orderItemId);
      if (!oi) fail("Item inválido.");
      const free = oi.quantity - (already.get(oi.id) ?? 0);
      if (it.quantity > free) fail(`Quantidade maior que a disponível para devolução: ${oi.productName}`);
      amount += oi.unitPrice * it.quantity;
    }

    const photos: string[] = [];
    for (const f of form.getAll("photos").slice(0, 4)) {
      if (f instanceof File && f.size > 0) photos.push(await saveUpload(f, { supplierId: reseller.supplierId, ownerResellerId: reseller.id, folder: "returns" }));
    }

    const [rt] = await db
      .insert(returns)
      .values({ supplierId: reseller.supplierId, resellerId: reseller.id, orderId: order.id, reason, details: details || null, items, photoFileIds: photos, requestedAmount: amount })
      .returning();
    await db.insert(orderEvents).values({ orderId: order.id, message: `Devolução solicitada: ${reason}`, actorName: user.name });
    await notify({
      supplierId: reseller.supplierId,
      toSupplier: true,
      title: `Devolução solicitada no pedido #${orderCode(order.number)}`,
      body: `${reseller.storeName || reseller.name}: ${reason}`,
      href: `/f/devolucoes/${rt.id}`,
    });
    return { id: rt.id };
  }, "Devolução solicitada");
}

async function ownedReturn(id: string, supplierId: string) {
  const r = await db.query.returns.findFirst({ where: and(eq(returns.id, id), eq(returns.supplierId, supplierId)), with: { order: true } });
  if (!r) fail("Devolução não encontrada.");
  return r;
}

export async function reviewReturn(id: string, decision: "APPROVED" | "REJECTED", note: string) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const r = await ownedReturn(id, supplier.id);
    if (r.status !== "REQUESTED") fail("Esta devolução já foi analisada.");
    await db
      .update(returns)
      .set({ status: decision, supplierNote: note.slice(0, 2000) || null, resolvedAt: decision === "REJECTED" ? new Date() : null })
      .where(eq(returns.id, r.id));
    await db.insert(orderEvents).values({ orderId: r.orderId, message: decision === "APPROVED" ? "Devolução aprovada" : "Devolução recusada", actorName: user.name });
    await notify({
      supplierId: supplier.id,
      resellerId: r.resellerId,
      toSupplier: false,
      title: `Devolução do pedido #${orderCode(r.order.number)} ${decision === "APPROVED" ? "aprovada" : "recusada"}`,
      body: note || (decision === "APPROVED" ? "Envie o produto de volta conforme orientação" : undefined),
      href: `/r/devolucoes`,
    });
  }, decision === "APPROVED" ? "Devolução aprovada" : "Devolução recusada");
}

export async function completeReturn(id: string, input: { refundAmount: number; restock: boolean; note: string }) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const r = await ownedReturn(id, supplier.id);
    if (r.status !== "APPROVED" && r.status !== "REQUESTED") fail("Esta devolução não pode ser concluída.");
    const refund = z.number().int().min(0).max(r.order.total).parse(input.refundAmount);
    await db.transaction(async (tx) => {
      await tx
        .update(returns)
        .set({ status: "COMPLETED", refundAmount: refund, resolvedAt: new Date(), supplierNote: input.note.slice(0, 2000) || r.supplierNote })
        .where(eq(returns.id, r.id));
      if (refund > 0) {
        await applyWallet(tx, {
          supplierId: supplier.id,
          resellerId: r.resellerId,
          type: "REFUND",
          amount: refund,
          description: `Estorno da devolução do pedido #${orderCode(r.order.number)}`,
          orderId: r.orderId,
          returnId: r.id,
          createdBy: user.name,
        });
      }
      if (input.restock) {
        const ids = r.items.map((i) => i.orderItemId);
        const ois = ids.length ? await tx.select().from(orderItems).where(inArray(orderItems.id, ids)) : [];
        for (const it of r.items) {
          const oi = ois.find((x) => x.id === it.orderItemId);
          if (oi?.variantId) await tx.update(variants).set({ stock: sql`${variants.stock} + ${it.quantity}` }).where(eq(variants.id, oi.variantId));
        }
      }
      await tx.insert(orderEvents).values({
        orderId: r.orderId,
        message: `Devolução concluída${refund > 0 ? `. Estorno de ${brl(refund)} no saldo.` : "."}`,
        actorName: user.name,
      });
      await notify(
        {
          supplierId: supplier.id,
          resellerId: r.resellerId,
          toSupplier: false,
          title: `Devolução do pedido #${orderCode(r.order.number)} concluída`,
          body: refund > 0 ? `${brl(refund)} estornado para seu saldo` : undefined,
          href: "/r/devolucoes",
        },
        tx,
      );
    });
  }, "Devolução concluída");
}
