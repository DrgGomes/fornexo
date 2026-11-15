import Link from "next/link";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { Plus, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, OrderStatusBadge, PageHeader, Pagination, ProductThumb, TabLinks } from "@/components/ui/misc";
import { SearchInput } from "@/components/ui/search-input";
import { db, orders, resellers } from "@/db";
import { requireReseller } from "@/lib/auth";
import { marketplaceLabel } from "@/lib/constants";
import { brl, formatDateTime, orderCode } from "@/lib/format";
import { firstImageSql, itemsCountSql, orderConditions } from "@/lib/order-filters";

export const metadata = { title: "Meus pedidos" };

const TABS = [
  { id: "todos", label: "Todos" },
  { id: "aguardando", label: "Aguardando pagamento" },
  { id: "abertos", label: "Em andamento" },
  { id: "enviados", label: "Enviados" },
  { id: "cancelados", label: "Cancelados" },
];

export default async function ResellerOrders({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; page?: string }> }) {
  const { reseller, supplier } = await requireReseller();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "todos";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = orderConditions(supplier.id, { tab, q: sp.q }, { resellerId: reseller.id });
  const [rows, [{ total }], [awaiting]] = await Promise.all([
    db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        total: orders.total,
        marketplace: orders.marketplace,
        ext: orders.externalOrderId,
        customer: orders.customerName,
        createdAt: orders.createdAt,
        tracking: orders.trackingCode,
        hasLabel: sql<boolean>`${orders.labelFileId} is not null`,
        items: itemsCountSql,
        image: firstImageSql,
      })
      .from(orders)
      .innerJoin(resellers, eq(resellers.id, orders.resellerId))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(30)
      .offset((page - 1) * 30),
    db.select({ total: count() }).from(orders).innerJoin(resellers, eq(resellers.id, orders.resellerId)).where(where),
    db.select({ n: count() }).from(orders).where(and(eq(orders.resellerId, reseller.id), inArray(orders.status, ["AWAITING_PAYMENT"]))),
  ]);
  return (
    <>
      <PageHeader
        title="Meus pedidos"
        actions={
          <>
            <ButtonLink href={`/api/export/pedidos?tab=${tab}`} variant="secondary" prefetch={false}>
              Exportar
            </ButtonLink>
            <ButtonLink href="/r/pedidos/novo">
              <Plus /> Novo pedido
            </ButtonLink>
          </>
        }
      />
      <TabLinks items={TABS.map((t) => ({ href: `/r/pedidos?tab=${t.id}`, label: t.label, count: t.id === "aguardando" ? awaiting.n : undefined, active: tab === t.id }))} />
      <SearchInput placeholder="Nº do pedido, pedido do marketplace ou cliente" className="mb-4" />
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<ReceiptText />} title="Nenhum pedido aqui" action={<ButtonLink href="/r/pedidos/novo">Fazer pedido</ButtonLink>} />
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((o) => (
              <Link key={o.id} href={`/r/pedidos/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 sm:px-5">
                <ProductThumb src={o.image} alt="" size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">#{orderCode(o.number)}</span>
                    <OrderStatusBadge status={o.status} />
                    {!o.hasLabel && o.status !== "CANCELED" && <Badge tone="orange">Sem etiqueta</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {marketplaceLabel(o.marketplace)}
                    {o.ext && ` ${o.ext}`}
                    {o.customer && ` · ${o.customer}`} · {o.items} {o.items === 1 ? "item" : "itens"}
                  </p>
                  <p className="text-xs text-zinc-400">{formatDateTime(o.createdAt)}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{brl(o.total)}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
      <Pagination page={page} totalPages={Math.ceil(total / 30)} makeHref={(p) => `/r/pedidos?tab=${tab}&page=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} />
    </>
  );
}
