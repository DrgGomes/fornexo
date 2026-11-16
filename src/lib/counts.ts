import "server-only";
import { sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";

/** Todas as contagens do menu do fornecedor em uma unica ida ao banco. */
export const supplierCounts = cache(async (supplierId: string) => {
  const r = await db.execute<Record<string, string>>(sql`
    select
      (select count(*) from orders where supplier_id = ${supplierId} and status in ('CONFIRMED','PICKING','PICKED','PACKED')) as to_process,
      (select count(*) from deposits where supplier_id = ${supplierId} and status = 'PENDING') as pending_deposits,
      (select count(*) from returns where supplier_id = ${supplierId} and status = 'REQUESTED') as pending_returns,
      (select count(*) from messages where supplier_id = ${supplierId} and from_supplier = false and read_at is null) as unread_msgs,
      (select count(*) from resellers where supplier_id = ${supplierId} and status = 'PENDING') as pending_resellers,
      (select count(*) from notifications where supplier_id = ${supplierId} and to_supplier = true and read_at is null) as unread,
      (select count(*) from imported_products where supplier_id = ${supplierId} and status = 'PENDING') as pending_imports`);
  const x = r.rows[0];
  return {
    toProcess: Number(x.to_process),
    pendingDeposits: Number(x.pending_deposits),
    pendingReturns: Number(x.pending_returns),
    unreadMsgs: Number(x.unread_msgs),
    pendingResellers: Number(x.pending_resellers),
    unread: Number(x.unread),
    pendingImports: Number(x.pending_imports),
  };
});

export async function resellerCounts(resellerId: string, supplierId: string, newsSeenAt: Date | null) {
  const r = await db.execute<Record<string, string>>(sql`
    select
      (select count(*) from messages where reseller_id = ${resellerId} and from_supplier = true and read_at is null) as unread_msgs,
      (select count(*) from notifications where reseller_id = ${resellerId} and to_supplier = false and read_at is null) as unread,
      (select count(*) from posts where supplier_id = ${supplierId} and published = true ${newsSeenAt ? sql`and created_at > ${newsSeenAt}` : sql``}) as news`);
  const x = r.rows[0];
  return { unreadMsgs: Number(x.unread_msgs), unread: Number(x.unread), news: Number(x.news) };
}
