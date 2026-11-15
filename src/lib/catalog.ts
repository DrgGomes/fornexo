import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { categories, db, favorites, products, variants } from "@/db";
import type { CatalogItem } from "@/components/reseller/product-card";

export type CatalogParams = { q?: string; cat?: string; sort?: string; estoque?: string; page?: string };

export async function loadCatalog(opts: { supplierId: string; resellerId?: string; params: CatalogParams; onlyFavorites?: boolean; perPage?: number }) {
  const { params: sp } = opts;
  const perPage = opts.perPage ?? 24;
  const page = Math.max(1, Number(sp.page) || 1);
  const stock = sql<number>`coalesce((select sum(vv.stock) from variants vv where vv.product_id = "products"."id"),0)::int`;
  const sold = sql<number>`coalesce((select sum(oi.quantity) from order_items oi join orders o on o.id = oi.order_id where oi.product_id = "products"."id" and o.status <> 'CANCELED' and o.created_at > now() - interval '30 days'),0)::int`;
  const variantCount = sql<number>`(select count(*) from variants vv where vv.product_id = "products"."id")::int`;
  const fav = opts.resellerId
    ? sql<boolean>`exists(select 1 from reseller_products f where f.product_id = "products"."id" and f.reseller_id = ${opts.resellerId})`
    : sql<boolean>`false`;

  const conds: SQL[] = [eq(products.supplierId, opts.supplierId), eq(products.status, "ACTIVE")];
  if (sp.q) conds.push(or(ilike(products.name, `%${sp.q}%`), ilike(products.sku, `%${sp.q}%`), sql`${sp.q.toLowerCase()} = any(${products.tags})`)!);
  if (sp.cat) conds.push(eq(products.categoryId, sp.cat));
  if (sp.estoque) conds.push(sql`${stock} > 0`);
  if (opts.onlyFavorites && opts.resellerId) conds.push(fav);

  const order =
    sp.sort === "vendidos"
      ? [desc(sold), desc(products.createdAt)]
      : sp.sort === "menor"
        ? [asc(products.price)]
        : sp.sort === "maior"
          ? [desc(products.price)]
          : sp.sort === "novos"
            ? [desc(products.createdAt)]
            : [desc(products.featured), desc(products.createdAt)];

  const [rows, [{ total }], cats] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        images: products.images,
        price: products.price,
        suggestedPrice: products.suggestedPrice,
        createdAt: products.createdAt,
        stock,
        sold,
        variantCount,
        favorite: fav,
      })
      .from(products)
      .where(and(...conds))
      .orderBy(...order)
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ total: sql<number>`count(*)::int` }).from(products).where(and(...conds)),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.supplierId, opts.supplierId)).orderBy(asc(categories.position), asc(categories.name)),
  ]);
  const weekAgo = Date.now() - 7 * 86400000;
  const items: CatalogItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    image: r.images[0] ?? null,
    price: r.price,
    suggestedPrice: r.suggestedPrice,
    stock: Number(r.stock),
    sold: Number(r.sold),
    isNew: r.createdAt.getTime() > weekAgo,
    favorite: !!r.favorite,
    variantCount: Number(r.variantCount),
  }));
  return { items, total, page, totalPages: Math.ceil(total / perPage), categories: cats };
}
