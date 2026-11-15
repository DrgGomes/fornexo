import { desc, eq, sql } from "drizzle-orm";
import { db, orders, resellers } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { marketplaceLabel, ORDER_STATUS } from "@/lib/constants";
import { centsToCsv, csvResponse, toCsv } from "@/lib/csv";
import { formatDateTime, orderCode } from "@/lib/format";
import { itemsCountSql, orderConditions, type OrderFilterParams } from "@/lib/order-filters";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams) as OrderFilterParams;
  let supplierId = user.supplierId;
  let resellerId: string | undefined;
  if (user.role === "RESELLER" && user.resellerId) {
    const r = await db.query.resellers.findFirst({ where: eq(resellers.id, user.resellerId) });
    supplierId = r?.supplierId ?? null;
    resellerId = user.resellerId;
  }
  if (!supplierId) return new Response("Sem permissão", { status: 403 });
  const rows = await db
    .select({
      number: orders.number,
      createdAt: orders.createdAt,
      status: orders.status,
      paid: orders.paid,
      marketplace: orders.marketplace,
      ext: orders.externalOrderId,
      customer: orders.customerName,
      reseller: sql<string>`coalesce(${resellers.storeName}, ${resellers.name})`,
      items: itemsCountSql,
      subtotal: orders.subtotal,
      fee: orders.handlingFee,
      total: orders.total,
      cost: orders.itemsCost,
      tracking: orders.trackingCode,
    })
    .from(orders)
    .innerJoin(resellers, eq(resellers.id, orders.resellerId))
    .where(orderConditions(supplierId, { ...sp, tab: sp.tab ?? "todos" }, { resellerId }))
    .orderBy(desc(orders.createdAt))
    .limit(20000);
  const isSupplier = user.role === "SUPPLIER";
  const header = ["Pedido", "Data", "Status", "Pago", "Canal", "Nº marketplace", "Cliente", "Revendedor", "Itens", "Produtos", "Taxa", "Total", ...(isSupplier ? ["Custo", "Lucro"] : []), "Rastreio"];
  const body = rows.map((r) => [
    orderCode(r.number),
    formatDateTime(r.createdAt),
    ORDER_STATUS[r.status].label,
    r.paid ? "Sim" : "Não",
    marketplaceLabel(r.marketplace),
    r.ext,
    r.customer,
    r.reseller,
    r.items,
    centsToCsv(r.subtotal),
    centsToCsv(r.fee),
    centsToCsv(r.total),
    ...(isSupplier ? [centsToCsv(r.cost), centsToCsv(r.total - r.cost)] : []),
    r.tracking,
  ]);
  return csvResponse(`pedidos-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(header, body));
}
