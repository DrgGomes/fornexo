import "server-only";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db, deposits, messages, notifications, orders, posts, resellers, returns } from "@/db";

export async function supplierCounts(supplierId: string) {
  const [toProcess, pendingDeposits, pendingReturns, unreadMsgs, pendingResellers, unread] = await Promise.all([
    db.select({ n: count() }).from(orders).where(and(eq(orders.supplierId, supplierId), sql`${orders.status} in ('CONFIRMED','PICKING','PICKED','PACKED')`)),
    db.select({ n: count() }).from(deposits).where(and(eq(deposits.supplierId, supplierId), eq(deposits.status, "PENDING"))),
    db.select({ n: count() }).from(returns).where(and(eq(returns.supplierId, supplierId), eq(returns.status, "REQUESTED"))),
    db.select({ n: count() }).from(messages).where(and(eq(messages.supplierId, supplierId), eq(messages.fromSupplier, false), isNull(messages.readAt))),
    db.select({ n: count() }).from(resellers).where(and(eq(resellers.supplierId, supplierId), eq(resellers.status, "PENDING"))),
    db.select({ n: count() }).from(notifications).where(and(eq(notifications.supplierId, supplierId), eq(notifications.toSupplier, true), isNull(notifications.readAt))),
  ]);
  return {
    toProcess: toProcess[0].n,
    pendingDeposits: pendingDeposits[0].n,
    pendingReturns: pendingReturns[0].n,
    unreadMsgs: unreadMsgs[0].n,
    pendingResellers: pendingResellers[0].n,
    unread: unread[0].n,
  };
}

export async function resellerCounts(resellerId: string, supplierId: string, newsSeenAt: Date | null) {
  const [unreadMsgs, unread, news] = await Promise.all([
    db.select({ n: count() }).from(messages).where(and(eq(messages.resellerId, resellerId), eq(messages.fromSupplier, true), isNull(messages.readAt))),
    db.select({ n: count() }).from(notifications).where(and(eq(notifications.resellerId, resellerId), eq(notifications.toSupplier, false), isNull(notifications.readAt))),
    db
      .select({ n: count() })
      .from(posts)
      .where(and(eq(posts.supplierId, supplierId), eq(posts.published, true), newsSeenAt ? sql`${posts.createdAt} > ${newsSeenAt}` : sql`true`)),
  ]);
  return { unreadMsgs: unreadMsgs[0].n, unread: unread[0].n, news: news[0].n };
}
