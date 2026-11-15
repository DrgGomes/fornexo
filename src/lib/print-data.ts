import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, orderItems, orders } from "@/db";

export async function loadOrdersForPrint(supplierId: string, idsParam: string | undefined) {
  const ids = (idsParam ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 300);
  if (!ids.length) return [];
  const list = await db.query.orders.findMany({
    where: and(eq(orders.supplierId, supplierId), inArray(orders.id, ids)),
    with: { items: { orderBy: asc(orderItems.id) }, reseller: { columns: { name: true, storeName: true, phone: true } } },
    orderBy: asc(orders.number),
  });
  return list;
}
