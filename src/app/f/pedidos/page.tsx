import { count, desc, eq, sql } from "drizzle-orm";
import { ReceiptText } from "lucide-react";
import { OrdersTable } from "@/components/supplier/orders-table";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination, TabLinks } from "@/components/ui/misc";
import { SearchInput } from "@/components/ui/search-input";
import { OrderFilters } from "@/components/supplier/order-filters";
import { db, orders, resellers } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { firstImageSql, itemsCountSql, ORDER_TABS, orderConditions, type OrderFilterParams } from "@/lib/order-filters";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Pedidos" };
const PER_PAGE = 50;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderFilterParams & { page?: string }> }) {
  const { supplier } = await requireSupplier();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = orderConditions(supplier.id, sp);
  const activeTab = sp.status ? "" : (sp.tab ?? "abertos");

  const [rows, [{ total }], tabCounts, resellerList] = await Promise.all([
    db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        paid: orders.paid,
        total: orders.total,
        marketplace: orders.marketplace,
        externalOrderId: orders.externalOrderId,
        customerName: orders.customerName,
        createdAt: orders.createdAt,
        hasLabel: sql<boolean>`${orders.labelFileId} is not null`,
        reseller: sql<string>`coalesce(${resellers.storeName}, ${resellers.name})`,
        items: itemsCountSql,
        image: firstImageSql,
      })
      .from(orders)
      .innerJoin(resellers, eq(resellers.id, orders.resellerId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(orders).innerJoin(resellers, eq(resellers.id, orders.resellerId)).where(where),
    db.select({ status: orders.status, n: count() }).from(orders).where(eq(orders.supplierId, supplier.id)).groupBy(orders.status),
    db.select({ id: resellers.id, name: sql<string>`coalesce(${resellers.storeName}, ${resellers.name})` }).from(resellers).where(eq(resellers.supplierId, supplier.id)).orderBy(resellers.name),
  ]);
  const sc = Object.fromEntries(tabCounts.map((t) => [t.status, t.n])) as Record<string, number>;

  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page" && k !== "tab" && k !== "status") base.set(k, v);
  const tabHref = (id: string) => {
    const p = new URLSearchParams(base);
    p.set("tab", id);
    return `/f/pedidos?${p.toString()}`;
  };
  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") exportParams.set(k, v);

  return (
    <>
      <PageHeader
        title="Pedidos"
        description={`${total} ${total === 1 ? "pedido" : "pedidos"}`}
        actions={
          <>
            <ButtonLink href={`/api/export/pedidos?${exportParams.toString()}`} variant="secondary" prefetch={false}>
              Exportar CSV
            </ButtonLink>
            <ButtonLink href="/f/bipagem">Bipar pedidos</ButtonLink>
          </>
        }
      />
      <TabLinks
        items={ORDER_TABS.map((t) => ({
          href: tabHref(t.id),
          label: t.label,
          count: t.statuses ? t.statuses.reduce((s, st) => s + (sc[st] ?? 0), 0) : undefined,
          active: activeTab === t.id,
        }))}
      />
      <div className="mb-4 flex flex-col gap-2 lg:flex-row">
        <SearchInput placeholder="Nº do pedido, pedido do marketplace, cliente, revendedor" className="flex-1" />
        <OrderFilters resellers={resellerList} />
      </div>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<ReceiptText />} title="Nenhum pedido encontrado" description="Ajuste os filtros ou aguarde novos pedidos dos revendedores." />
        ) : (
          <OrdersTable rows={rows} />
        )}
      </Card>
      <Pagination
        page={page}
        totalPages={Math.ceil(total / PER_PAGE)}
        makeHref={(p) => {
          const q = new URLSearchParams(exportParams);
          q.set("page", String(p));
          return `/f/pedidos?${q.toString()}`;
        }}
      />
    </>
  );
}
