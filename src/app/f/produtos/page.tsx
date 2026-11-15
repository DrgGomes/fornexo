import Link from "next/link";
import { and, asc, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { Package, Plus } from "lucide-react";
import { CategoriesManager } from "@/components/supplier/categories-manager";
import { ProductRowActions } from "@/components/supplier/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination, ProductThumb, TabLinks } from "@/components/ui/misc";
import { SearchInput } from "@/components/ui/search-input";
import { categories, db, products, variants } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { brl } from "@/lib/format";

export const metadata = { title: "Produtos" };
const PER_PAGE = 30;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supplier } = await requireSupplier();
  const sp = await searchParams;
  const tab = sp.tab ?? "ativos";
  const page = Math.max(1, Number(sp.page) || 1);

  const stockSum = sql<number>`coalesce((select sum(vv.stock) from variants vv where vv.product_id = "products"."id"),0)`;
  const variantCount = sql<number>`(select count(*) from variants vv where vv.product_id = "products"."id")`;

  const conds: SQL[] = [eq(products.supplierId, supplier.id)];
  if (tab === "ativos") conds.push(eq(products.status, "ACTIVE"));
  else if (tab === "rascunhos") conds.push(eq(products.status, "DRAFT"));
  else if (tab === "arquivados") conds.push(eq(products.status, "ARCHIVED"));
  else if (tab === "sem-estoque") conds.push(ne(products.status, "ARCHIVED"), sql`${stockSum} <= 0`);
  if (sp.q) conds.push(or(ilike(products.name, `%${sp.q}%`), ilike(products.sku, `%${sp.q}%`), ilike(products.ean, `%${sp.q}%`))!);
  if (sp.cat) conds.push(eq(products.categoryId, sp.cat));
  const where = and(...conds);

  const [rows, [{ total }], cats, tabCounts] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        price: products.price,
        images: products.images,
        status: products.status,
        featured: products.featured,
        hasVariants: products.hasVariants,
        lowStockAlert: products.lowStockAlert,
        category: categories.name,
        stock: stockSum,
        variantCount,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(where)
      .orderBy(desc(products.featured), desc(products.updatedAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(products).where(where),
    db
      .select({ id: categories.id, name: categories.name, count: sql<number>`(select count(*) from products pp where pp.category_id = "categories"."id")::int` })
      .from(categories)
      .where(eq(categories.supplierId, supplier.id))
      .orderBy(asc(categories.position), asc(categories.name)),
    db.select({ status: products.status, n: count() }).from(products).where(eq(products.supplierId, supplier.id)).groupBy(products.status),
  ]);
  const tc = Object.fromEntries(tabCounts.map((t) => [t.status, t.n]));

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tab, q: sp.q, cat: sp.cat, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/f/produtos?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Produtos"
        description={`${total} ${total === 1 ? "produto" : "produtos"} nesta visão`}
        actions={
          <>
            <CategoriesManager categories={cats} />
            <ButtonLink href="/f/produtos/novo">
              <Plus /> Novo produto
            </ButtonLink>
          </>
        }
      />

      <TabLinks
        items={[
          { href: qs({ tab: "ativos", page: undefined }), label: "Ativos", count: tc.ACTIVE, active: tab === "ativos" },
          { href: qs({ tab: "rascunhos", page: undefined }), label: "Rascunhos", count: tc.DRAFT, active: tab === "rascunhos" },
          { href: qs({ tab: "sem-estoque", page: undefined }), label: "Sem estoque", active: tab === "sem-estoque" },
          { href: qs({ tab: "arquivados", page: undefined }), label: "Arquivados", count: tc.ARCHIVED, active: tab === "arquivados" },
          { href: qs({ tab: "todos", page: undefined }), label: "Todos", active: tab === "todos" },
        ]}
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Buscar por nome, SKU ou EAN" className="flex-1" />
        {cats.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Link
              href={qs({ cat: undefined, page: undefined })}
              className={`inline-flex h-10 shrink-0 items-center rounded-xl px-3 text-[13px] font-medium ring-1 ${!sp.cat ? "bg-brand/10 text-brand ring-brand/30" : "bg-white text-zinc-600 ring-zinc-200"}`}
            >
              Todas
            </Link>
            {cats.map((c) => (
              <Link
                key={c.id}
                href={qs({ cat: c.id, page: undefined })}
                className={`inline-flex h-10 shrink-0 items-center rounded-xl px-3 text-[13px] font-medium ring-1 ${sp.cat === c.id ? "bg-brand/10 text-brand ring-brand/30" : "bg-white text-zinc-600 ring-zinc-200"}`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={sp.q ? "Nada encontrado" : "Nenhum produto aqui"}
            description={sp.q ? "Tente buscar por outro termo." : "Cadastre produtos com variações, fotos e títulos prontos para os revendedores."}
            action={
              <ButtonLink href="/f/produtos/novo">
                <Plus /> Cadastrar produto
              </ButtonLink>
            }
          />
        ) : (
          <>
            <div className="hidden grid-cols-[1fr_120px_110px_110px_44px] gap-4 border-b border-zinc-100 px-5 py-2.5 text-xs font-medium text-zinc-500 md:grid">
              <span>Produto</span>
              <span className="text-right">Preço revenda</span>
              <span className="text-right">Estoque</span>
              <span>Status</span>
              <span />
            </div>
            <div className="divide-y divide-zinc-100">
              {rows.map((p) => {
                const stock = Number(p.stock);
                return (
                  <div key={p.id} className="relative flex items-center gap-3 px-4 py-3 hover:bg-zinc-50/70 md:grid md:grid-cols-[1fr_120px_110px_110px_44px] md:gap-4 md:px-5">
                    <Link href={`/f/produtos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <ProductThumb src={p.images[0]} alt={p.name} size={52} />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 md:line-clamp-1">
                          {p.featured && <span className="mr-1.5 inline-block size-1.5 -translate-y-0.5 rounded-full bg-amber-400" title="Destaque" />}
                          {p.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {p.sku}
                          {p.category && ` · ${p.category}`}
                          {p.hasVariants && ` · ${p.variantCount} variações`}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs md:hidden">
                          <span className="font-semibold text-zinc-900">{brl(p.price)}</span>
                          <span className={stock <= 0 ? "text-red-600" : stock <= p.lowStockAlert ? "text-amber-600" : "text-zinc-500"}>{stock} em estoque</span>
                        </p>
                      </div>
                    </Link>
                    <span className="hidden text-right text-sm font-medium tabular-nums md:block">{brl(p.price)}</span>
                    <span className="hidden text-right md:block">
                      <span
                        className={`text-sm font-medium tabular-nums ${stock <= 0 ? "text-red-600" : stock <= p.lowStockAlert ? "text-amber-600" : "text-zinc-700"}`}
                      >
                        {stock}
                      </span>
                    </span>
                    <span className="hidden md:block">
                      {p.status === "ACTIVE" ? (
                        <Badge tone="emerald" dot>
                          Ativo
                        </Badge>
                      ) : p.status === "DRAFT" ? (
                        <Badge tone="zinc" dot>
                          Rascunho
                        </Badge>
                      ) : (
                        <Badge tone="zinc">Arquivado</Badge>
                      )}
                    </span>
                    <ProductRowActions id={p.id} status={p.status} featured={p.featured} slug={supplier.slug} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
      <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} makeHref={(p) => qs({ page: String(p) })} />
    </>
  );
}
