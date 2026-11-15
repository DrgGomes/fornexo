"use server";

import { and, eq } from "drizzle-orm";
import { db, deposits } from "@/db";
import { fail, run } from "@/lib/action";
import { requireSupplier } from "@/lib/auth";
import { brl } from "@/lib/format";
import { notify } from "@/lib/notify";
import { applyWallet, payPendingOrders } from "@/lib/wallet";

export async function approveDeposit(id: string, amount?: number) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    return db.transaction(async (tx) => {
      const [d] = await tx
        .update(deposits)
        .set({ status: "APPROVED", reviewedAt: new Date(), reviewedBy: user.name, ...(amount && amount > 0 ? { amount } : {}) })
        .where(and(eq(deposits.id, id), eq(deposits.supplierId, supplier.id), eq(deposits.status, "PENDING")))
        .returning();
      if (!d) fail("Depósito não encontrado ou já analisado.");
      await applyWallet(tx, {
        supplierId: supplier.id,
        resellerId: d.resellerId,
        type: "DEPOSIT",
        amount: d.amount,
        description: "Depósito via PIX aprovado",
        depositId: d.id,
        createdBy: user.name,
      });
      const paid = await payPendingOrders(tx, supplier.id, d.resellerId);
      await notify(
        {
          supplierId: supplier.id,
          resellerId: d.resellerId,
          toSupplier: false,
          title: `Depósito de ${brl(d.amount)} aprovado`,
          body: paid ? `${paid} pedido(s) foram pagos automaticamente` : "Saldo disponível para novos pedidos",
          href: "/r/carteira",
        },
        tx,
      );
      return { paid };
    });
  });
}

export async function rejectDeposit(id: string, reason: string) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const [d] = await db
      .update(deposits)
      .set({ status: "REJECTED", reviewedAt: new Date(), reviewedBy: user.name, rejectReason: reason.slice(0, 300) || null })
      .where(and(eq(deposits.id, id), eq(deposits.supplierId, supplier.id), eq(deposits.status, "PENDING")))
      .returning();
    if (!d) fail("Depósito não encontrado ou já analisado.");
    await notify({
      supplierId: supplier.id,
      resellerId: d.resellerId,
      toSupplier: false,
      title: `Depósito de ${brl(d.amount)} recusado`,
      body: reason || "Fale com o fornecedor para mais detalhes",
      href: "/r/carteira",
    });
  }, "Depósito recusado");
}
