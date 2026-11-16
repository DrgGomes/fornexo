import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { categories, db, products } from "@/db";
import type { SupplierRow } from "./auth";
import { resolveLanding } from "./landing";

export async function loadLanding(s: SupplierRow) {
  const config = resolveLanding(s);
  const active = and(eq(products.supplierId, s.id), eq(products.status, "ACTIVE"));
  const sold = sql<number>`coalesce((select sum(oi.quantity) from order_items oi join orders o on o.id = oi.order_id where oi.product_id = "products"."id" and o.status <> 'CANCELED'),0)`;
  const order =
    config.productsSource === "new"
      ? [desc(products.createdAt)]
      : config.productsSource === "best"
        ? [desc(sold), desc(products.createdAt)]
        : [desc(products.featured), desc(products.createdAt)];
  const [[{ n }], cats, list] = await Promise.all([
    db.select({ n: count() }).from(products).where(active),
    db
      .select({
        id: categories.id,
        name: categories.name,
        count: sql<number>`(select count(*) from products pp where pp.category_id = "categories"."id" and pp.status = 'ACTIVE')::int`,
      })
      .from(categories)
      .where(eq(categories.supplierId, s.id))
      .orderBy(asc(categories.position), asc(categories.name)),
    s.showcasePublic
      ? db
          .select({ id: products.id, name: products.name, images: products.images, price: products.price, suggestedPrice: products.suggestedPrice })
          .from(products)
          .where(active)
          .orderBy(...order)
          .limit(config.productsCount)
      : Promise.resolve([]),
  ]);
  return {
    config,
    productCount: n,
    categories: cats.filter((c) => c.count > 0),
    products: list.map((p) => ({ id: p.id, name: p.name, image: p.images[0] ?? null, price: p.price, suggestedPrice: p.suggestedPrice })),
  };
}
