"use server";

import { and, asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db, deposits, favorites, feeProfiles, orderEvents, orders, products, resellers, variants } from "@/db";
import { fail, run } from "@/lib/action";
import { requireReseller } from "@/lib/auth";
import { MARKETPLACES } from "@/lib/constants";
import { brl, orderCode } from "@/lib/format";
import { notify } from "@/lib/notify";
import { cancelOrderTx, createOrderTx } from "@/lib/orders";
import { saveUpload } from "@/lib/storage";
import { tryPayOrder } from "@/lib/wallet";

export async function toggleFavorite(productId: string) {
  return run(async () => {
    const { reseller } = await requireReseller();
    const p = await db.query.products.findFirst({ where: and(eq(products.id, productId), eq(products.supplierId, reseller.supplierId)), columns: { id: true } });
    if (!p) fail("Produto não encontrado.");
    const existing = await db.query.favorites.findFirst({ where: and(eq(favorites.resellerId, reseller.id), eq(favorites.productId, p.id)) });
    if (existing) {
      await db.delete(favorites).where(and(eq(favorites.resellerId, reseller.id), eq(favorites.productId, p.id)));
      return { favorite: false };
    }
    await db.insert(favorites).values({ resellerId: reseller.id, productId: p.id });
    return { favorite: true };
  });
}

export type OrderProductOption = {
  id: string;
  name: string;
  sku: string;
  image: string | null;
  price: number;
  hasVariants: boolean;
  variants: { id: string; name: string; sku: string; stock: number; price: number; image: string | null }[];
};

export async function searchProductsForOrder(q: string) {
  return run(async (): Promise<OrderProductOption[]> => {
    const { reseller } = await requireReseller();
    const term = q.trim();
    const list = await db.query.products.findMany({
      where: and(
        eq(products.supplierId, reseller.supplierId),
        eq(products.status, "ACTIVE"),
        term ? or(ilike(products.name, `%${term}%`), ilike(products.sku, `%${term}%`)) : undefined,
      ),
      with: { variants: { orderBy: asc(variants.position) } },
      orderBy: asc(products.name),
      limit: 20,
    });
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      image: p.images[0] ?? null,
      price: p.price,
      hasVariants: p.hasVariants,
      variants: p.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, stock: v.stock, price: v.price ?? p.price, image: v.imageUrl || p.images[0] || null })),
    }));
  });
}

const orderSchema = z.object({
  lines: z.array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(10000) })).min(1, "Adicione ao menos um item"),
  marketplace: z.enum(MARKETPLACES.map((m) => m.id) as [string, ...string[]]),
  externalOrderId: z.string().trim().max(80).optional(),
  customerName: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function createOrder(form: FormData) {
  return run(async () => {
    const { reseller, supplier, user } = await requireReseller();
    const d = orderSchema.parse(JSON.parse(String(form.get("payload") ?? "{}")));
    const file = form.get("label");
    const hasFile = file instanceof File && file.size > 0;
    if (supplier.requireLabel && !hasFile) fail("Anexe a etiqueta de envio do marketplace.");
    const labelFileId = hasFile ? await saveUpload(file as File, { supplierId: supplier.id, ownerResellerId: reseller.id, folder: "labels" }) : null;
    return db.transaction((tx) =>
      createOrderTx(tx, {
        supplierId: supplier.id,
        resellerId: reseller.id,
        handlingFee: supplier.handlingFee,
        lines: d.lines,
        marketplace: d.marketplace,
        externalOrderId: d.externalOrderId,
        customerName: d.customerName,
        notes: d.notes,
        labelFileId,
        actorName: user.name,
      }),
    );
  });
}

export async function payOrderWithBalance(orderId: string) {
  return run(async () => {
    const { reseller, user } = await requireReseller();
    const order = await db.query.orders.findFirst({ where: and(eq(orders.id, orderId), eq(orders.resellerId, reseller.id)) });
    if (!order) fail("Pedido não encontrado.");
    if (order.paid) fail("Pedido já está pago.");
    if (order.status !== "AWAITING_PAYMENT") fail("Este pedido não aguarda pagamento.");
    const ok = await db.transaction(async (tx) => {
      const paid = await tryPayOrder(tx, order, user.name);
      if (paid)
        await notify(
          { supplierId: order.supplierId, toSupplier: true, title: `Pedido #${orderCode(order.number)} pago`, body: "Pronto para separação", href: `/f/pedidos/${order.id}` },
          tx,
        );
      return paid;
    });
    if (!ok) fail(`Saldo insuficiente. Este pedido custa ${brl(order.total)}.`);
  }, "Pedido pago com saldo");
}

export async function cancelOrderByReseller(orderId: string, reason: string) {
  return run(async () => {
    const { reseller, user } = await requireReseller();
    const order = await db.query.orders.findFirst({ where: and(eq(orders.id, orderId), eq(orders.resellerId, reseller.id)) });
    if (!order) fail("Pedido não encontrado.");
    if (!["AWAITING_PAYMENT", "CONFIRMED"].includes(order.status)) fail("O fornecedor já começou a separar este pedido. Fale com ele pelo chat.");
    await db.transaction((tx) => cancelOrderTx(tx, order, { reason: reason.slice(0, 300), actorName: user.name, bySupplier: false, allowedFrom: ["AWAITING_PAYMENT", "CONFIRMED"] }));
  }, "Pedido cancelado");
}

export async function replaceLabel(form: FormData) {
  return run(async () => {
    const { reseller, user } = await requireReseller();
    const order = await db.query.orders.findFirst({ where: and(eq(orders.id, String(form.get("orderId"))), eq(orders.resellerId, reseller.id)) });
    if (!order) fail("Pedido não encontrado.");
    if (!["AWAITING_PAYMENT", "CONFIRMED", "PICKING"].includes(order.status)) fail("O pedido já foi separado. Fale com o fornecedor pelo chat.");
    const file = form.get("file");
    if (!(file instanceof File)) fail("Selecione o arquivo.");
    const fileId = await saveUpload(file, { supplierId: order.supplierId, ownerResellerId: reseller.id, folder: "labels" });
    await db.update(orders).set({ labelFileId: fileId }).where(eq(orders.id, order.id));
    await db.insert(orderEvents).values({ orderId: order.id, message: order.labelFileId ? "Etiqueta substituída" : "Etiqueta anexada", actorName: user.name });
    await notify({ supplierId: order.supplierId, toSupplier: true, title: `Etiqueta ${order.labelFileId ? "atualizada" : "anexada"} no pedido #${orderCode(order.number)}`, href: `/f/pedidos/${order.id}` });
  }, "Etiqueta enviada");
}

export async function createDeposit(form: FormData) {
  return run(async () => {
    const { reseller, supplier } = await requireReseller();
    const amount = z.number().int().min(100, "Valor mínimo de R$ 1,00").max(10_000_000).parse(Number(form.get("amount")));
    const note = String(form.get("note") ?? "").slice(0, 200);
    const file = form.get("proof");
    const proofFileId = file instanceof File && file.size > 0 ? await saveUpload(file, { supplierId: supplier.id, ownerResellerId: reseller.id, folder: "proofs" }) : null;
    await db.insert(deposits).values({ supplierId: supplier.id, resellerId: reseller.id, amount, proofFileId, note: note || null });
    await notify({ supplierId: supplier.id, toSupplier: true, title: `Depósito de ${brl(amount)} para aprovar`, body: reseller.storeName || reseller.name, href: "/f/financeiro?tab=depositos" });
  }, "Comprovante enviado. Assim que o fornecedor confirmar, o saldo entra na sua carteira.");
}

const feeSchema = z.array(
  z.object({
    name: z.string().trim().min(1, "Dê um nome para cada plataforma").max(60),
    commissionPct: z.number().min(0).max(99),
    extraPct: z.number().min(0).max(99),
    fixedFee: z.number().int().min(0).max(1_000_000),
    fixedFeeThreshold: z.number().int().min(0).max(100_000_000).nullable(),
    shippingCost: z.number().int().min(0).max(1_000_000),
  }),
);

export async function saveFeeProfiles(input: z.infer<typeof feeSchema>) {
  return run(async () => {
    const { reseller } = await requireReseller();
    const list = feeSchema.parse(input).slice(0, 15);
    await db.transaction(async (tx) => {
      await tx.delete(feeProfiles).where(eq(feeProfiles.resellerId, reseller.id));
      if (list.length) await tx.insert(feeProfiles).values(list.map((f, i) => ({ ...f, fixedFeeThreshold: f.fixedFeeThreshold || null, resellerId: reseller.id, position: i })));
    });
  }, "Taxas salvas");
}

const costSchema = z.object({
  taxPct: z.number().min(0).max(99),
  adsPct: z.number().min(0).max(99),
  packagingCost: z.number().int().min(0).max(1_000_000),
  otherCost: z.number().int().min(0).max(1_000_000),
  targetMarginPct: z.number().min(0).max(95),
});

export async function saveCosts(input: z.infer<typeof costSchema>) {
  return run(async () => {
    const { reseller } = await requireReseller();
    await db.update(resellers).set(costSchema.parse(input)).where(eq(resellers.id, reseller.id));
  }, "Custos salvos");
}

export async function updateResellerProfile(input: { name: string; storeName?: string; phone?: string; document?: string; marketplaces: string[] }) {
  return run(async () => {
    const { reseller } = await requireReseller();
    const name = z.string().trim().min(2, "Informe seu nome").max(120).parse(input.name);
    await db
      .update(resellers)
      .set({
        name,
        storeName: input.storeName?.trim() || null,
        phone: input.phone?.trim() || null,
        document: input.document?.trim() || null,
        marketplaces: input.marketplaces.filter((m) => MARKETPLACES.some((x) => x.id === m)),
      })
      .where(eq(resellers.id, reseller.id));
  }, "Perfil atualizado");
}
