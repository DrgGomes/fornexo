"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, orderEvents, orderItems, orders, resellers, type OrderStatus } from "@/db";
import { fail, run } from "@/lib/action";
import { requireSupplier } from "@/lib/auth";
import { ALL_ORDER_STATUSES } from "@/lib/constants";
import { cancelOrderTx, markPaidManuallyTx, setOrderStatusTx } from "@/lib/orders";
import { saveUpload } from "@/lib/storage";

const statusSchema = z.enum(ALL_ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]);

async function loadOrder(id: string, supplierId: string) {
  const o = await db.query.orders.findFirst({ where: and(eq(orders.id, id), eq(orders.supplierId, supplierId)) });
  if (!o) fail("Pedido não encontrado.");
  return o;
}

export async function supplierSetStatus(orderId: string, status: OrderStatus) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const to = statusSchema.parse(status);
    const order = await loadOrder(orderId, supplier.id);
    await db.transaction((tx) => setOrderStatusTx(tx, order, to, user.name));
  }, "Status atualizado");
}

export async function supplierBulkStatus(ids: string[], status: OrderStatus) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const to = statusSchema.parse(status);
    const list = await db.query.orders.findMany({ where: and(eq(orders.supplierId, supplier.id), inArray(orders.id, ids.slice(0, 300))) });
    let ok = 0;
    let skipped = 0;
    for (const o of list) {
      try {
        await db.transaction((tx) => setOrderStatusTx(tx, o, to, user.name));
        ok++;
      } catch {
        skipped++;
      }
    }
    return { ok, skipped };
  });
}

export async function supplierMarkPaid(orderId: string) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const order = await loadOrder(orderId, supplier.id);
    await db.transaction((tx) => markPaidManuallyTx(tx, order, user.name));
  }, "Pedido marcado como pago");
}

export async function supplierCancel(orderId: string, reason: string) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const order = await loadOrder(orderId, supplier.id);
    await db.transaction((tx) => cancelOrderTx(tx, order, { reason: reason.slice(0, 300), actorName: user.name, bySupplier: true }));
  }, "Pedido cancelado");
}

export async function supplierUpdateOrder(orderId: string, data: { trackingCode?: string; supplierNotes?: string }) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const order = await loadOrder(orderId, supplier.id);
    const tracking = data.trackingCode?.trim().slice(0, 80) || null;
    await db
      .update(orders)
      .set({ trackingCode: tracking, supplierNotes: data.supplierNotes?.slice(0, 2000) || null })
      .where(eq(orders.id, order.id));
    if (tracking && tracking !== order.trackingCode) {
      await db.insert(orderEvents).values({ orderId: order.id, message: `Código de rastreio: ${tracking}`, actorName: user.name });
    }
  }, "Pedido atualizado");
}

export async function supplierUploadLabel(form: FormData) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const order = await loadOrder(String(form.get("orderId")), supplier.id);
    const file = form.get("file");
    if (!(file instanceof File)) fail("Selecione o arquivo da etiqueta.");
    const fileId = await saveUpload(file, { supplierId: supplier.id, ownerResellerId: order.resellerId, folder: "labels" });
    await db.update(orders).set({ labelFileId: fileId }).where(eq(orders.id, order.id));
    await db.insert(orderEvents).values({ orderId: order.id, message: "Etiqueta anexada pelo fornecedor", actorName: user.name });
  }, "Etiqueta anexada");
}

export type ScanResult = {
  id: string;
  number: number;
  status: OrderStatus;
  paid: boolean;
  reseller: string;
  customer: string | null;
  marketplace: string;
  items: number;
  hasLabel: boolean;
  changed: boolean;
  previous: OrderStatus;
};

export async function scanOrder(code: string, status: OrderStatus | null) {
  return run(async (): Promise<ScanResult> => {
    const { supplier, user } = await requireSupplier();
    const digits = code.replace(/\D/g, "");
    if (!digits) fail("Código inválido.");
    const number = parseInt(digits, 10);
    const order = await db.query.orders.findFirst({ where: and(eq(orders.supplierId, supplier.id), eq(orders.number, number)) });
    if (!order) fail(`Pedido ${digits} não encontrado.`);
    let changed = false;
    if (status) {
      const to = statusSchema.parse(status);
      const r = await db.transaction((tx) => setOrderStatusTx(tx, order, to, user.name));
      changed = r.changed;
    }
    const [reseller, [{ n }]] = await Promise.all([
      db.query.resellers.findFirst({ where: eq(resellers.id, order.resellerId), columns: { name: true, storeName: true } }),
      db.select({ n: count() }).from(orderItems).where(eq(orderItems.orderId, order.id)),
    ]);
    return {
      id: order.id,
      number: order.number,
      status: status && changed ? status : order.status,
      previous: order.status,
      paid: order.paid,
      reseller: reseller?.storeName || reseller?.name || "",
      customer: order.customerName,
      marketplace: order.marketplace,
      items: n,
      hasLabel: !!order.labelFileId,
      changed,
    };
  });
}
