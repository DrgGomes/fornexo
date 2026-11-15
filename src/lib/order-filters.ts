import { and, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { orders, resellers, type OrderStatus } from "@/db";
import { ALL_ORDER_STATUSES } from "./constants";

export const ORDER_TABS: { id: string; label: string; statuses: OrderStatus[] | null }[] = [
  { id: "abertos", label: "Para enviar", statuses: ["CONFIRMED", "PICKING", "PICKED", "PACKED"] },
  { id: "aguardando", label: "Aguardando pagamento", statuses: ["AWAITING_PAYMENT"] },
  { id: "enviados", label: "Enviados", statuses: ["SHIPPED", "DELIVERED"] },
  { id: "cancelados", label: "Cancelados", statuses: ["CANCELED"] },
  { id: "todos", label: "Todos", statuses: null },
];

export type OrderFilterParams = { tab?: string; status?: string; q?: string; rid?: string; from?: string; to?: string; mkt?: string };

export function orderConditions(supplierId: string, sp: OrderFilterParams, opts?: { resellerId?: string }) {
  const conds: SQL[] = [eq(orders.supplierId, supplierId)];
  if (opts?.resellerId) conds.push(eq(orders.resellerId, opts.resellerId));
  if (sp.status && (ALL_ORDER_STATUSES as string[]).includes(sp.status)) conds.push(eq(orders.status, sp.status as OrderStatus));
  else {
    const tab = ORDER_TABS.find((t) => t.id === (sp.tab ?? (opts?.resellerId ? "todos" : "abertos")));
    if (tab?.statuses) conds.push(inArray(orders.status, tab.statuses));
  }
  if (sp.rid) conds.push(eq(orders.resellerId, sp.rid));
  if (sp.mkt) conds.push(eq(orders.marketplace, sp.mkt));
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) conds.push(gte(orders.createdAt, new Date(`${sp.from}T00:00:00-03:00`)));
  if (sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)) conds.push(lt(orders.createdAt, new Date(new Date(`${sp.to}T00:00:00-03:00`).getTime() + 86400000)));
  if (sp.q) {
    const q = sp.q.trim();
    const digits = q.replace(/\D/g, "");
    const ors: SQL[] = [
      ilike(orders.externalOrderId, `%${q}%`),
      ilike(orders.customerName, `%${q}%`),
      ilike(orders.trackingCode, `%${q}%`),
      ilike(resellers.name, `%${q}%`),
      ilike(resellers.storeName, `%${q}%`),
    ];
    if (digits && digits.length <= 9 && digits === q) ors.push(eq(orders.number, parseInt(digits, 10)));
    conds.push(or(...ors)!);
  }
  return and(...conds)!;
}

export const itemsCountSql = sql<number>`(select coalesce(sum(quantity),0) from order_items oi where oi.order_id = "orders"."id")::int`;
export const firstImageSql = sql<string | null>`(select image_url from order_items oi where oi.order_id = "orders"."id" limit 1)`;
