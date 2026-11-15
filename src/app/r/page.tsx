import Link from "next/link";
import { and, count, desc, eq, gte, inArray, ne, sum } from "drizzle-orm";
import { ArrowRight, Calculator, Heart, Package, Plus, Store, Wallet } from "lucide-react";
import { RevenueChart } from "@/components/charts/area-chart";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, OrderStatusBadge, PageHeader, ProductThumb, StatCard } from "@/components/ui/misc";
import { db, orders, posts, products } from "@/db";
import { requireReseller } from "@/lib/auth";
import { brl, orderCode, startOfMonthSP, timeAgo } from "@/lib/format";
import { dailySeries } from "@/lib/stats";
import { safeColor } from "@/lib/utils";

export const metadata = { title: "Início" };

export default async function ResellerHome() {
  const { reseller, supplier, user } = await requireReseller();
  const month = startOfMonthSP();
  const [monthAgg, inProgress, awaiting, recent, news, newProducts, series] = await Promise.all([
    db.select({ n: count(), total: sum(orders.total) }).from(orders).where(and(eq(orders.resellerId, reseller.id), ne(orders.status, "CANCELED"), gte(orders.createdAt, month))),
    db.select({ n: count() }).from(orders).where(and(eq(orders.resellerId, reseller.id), inArray(orders.status, ["CONFIRMED", "PICKING", "PICKED", "PACKED"]))),
    db.select({ n: count(), total: sum(orders.total) }).from(orders).where(and(eq(orders.resellerId, reseller.id), eq(orders.status, "AWAITING_PAYMENT"))),
    db.query.orders.findMany({ where: eq(orders.resellerId, reseller.id), orderBy: desc(orders.createdAt), limit: 5 }),
    db.query.posts.findMany({ where: and(eq(posts.supplierId, supplier.id), eq(posts.published, true)), orderBy: [desc(posts.pinned), desc(posts.createdAt)], limit: 3 }),
    db.query.products.findMany({ where: and(eq(products.supplierId, supplier.id), eq(products.status, "ACTIVE")), orderBy: desc(products.createdAt), limit: 8 }),
    dailySeries({ supplierId: supplier.id, resellerId: reseller.id, days: 30 }),
  ]);
  const awaitingTotal = Number(awaiting[0].total ?? 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        description={supplier.shippingDeadline || `Bem-vindo ao portal de ${supplier.name}`}
        actions={
          <ButtonLink href="/r/pedidos/novo">
            <Plus /> Novo pedido
          </ButtonLink>
        }
      />

      {awaiting[0].n > 0 && (
        <Link href="/r/carteira" className="mb-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <Wallet className="size-5 shrink-0 text-amber-700" />
          <p className="min-w-0 flex-1 text-sm text-amber-900">
            <span className="font-semibold">
              {awaiting[0].n} {awaiting[0].n === 1 ? "pedido aguardando" : "pedidos aguardando"} pagamento
            </span>{" "}
            ({brl(awaitingTotal)}). Adicione saldo para o fornecedor começar a separar.
          </p>
          <ArrowRight className="size-4 text-amber-700" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard accent label="Saldo disponível" value={brl(reseller.balance)} hint="Toque para adicionar" href="/r/carteira" icon={<Wallet />} />
        <StatCard label="Em andamento" value={inProgress[0].n} hint="Sendo preparados" href="/r/pedidos?tab=abertos" />
        <StatCard label="Pedidos no mês" value={monthAgg[0].n} />
        <StatCard label="Compras no mês" value={brl(Number(monthAgg[0].total ?? 0))} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/r/catalogo", label: "Ver catálogo", icon: Store },
          { href: "/r/pedidos/novo", label: "Fazer pedido", icon: Package },
          { href: "/r/meus-produtos", label: "Meus produtos", icon: Heart },
          { href: "/r/calculadora", label: "Calcular preço", icon: Calculator },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200/70 transition hover:ring-zinc-300">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <a.icon className="size-5" />
            </span>
            <span className="text-sm font-semibold">{a.label}</span>
          </Link>
        ))}
      </div>

      {newProducts.length > 0 && (
        <Card className="mt-5">
          <CardHeader
            title="Novidades no catálogo"
            action={
              <ButtonLink href="/r/catalogo" variant="ghost" size="sm">
                Ver tudo <ArrowRight />
              </ButtonLink>
            }
          />
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-5">
            {newProducts.map((p) => (
              <Link key={p.id} href={`/r/catalogo/${p.id}`} className="w-36 shrink-0">
                <ProductThumb src={p.images[0]} alt={p.name} size={144} className="rounded-2xl" />
                <p className="mt-2 line-clamp-2 text-[13px] leading-snug font-medium">{p.name}</p>
                <p className="mt-0.5 text-sm font-semibold">{brl(p.price)}</p>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Suas compras" description="Últimos 30 dias" />
          <CardBody>
            <RevenueChart data={series} color={safeColor(supplier.primaryColor)} height={200} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Notícias"
            action={
              <ButtonLink href="/r/noticias" variant="ghost" size="sm">
                Ver todas
              </ButtonLink>
            }
          />
          <CardBody className="flex flex-col gap-3">
            {news.length === 0 && <p className="text-sm text-zinc-500">Sem comunicados.</p>}
            {news.map((n) => (
              <Link key={n.id} href="/r/noticias" className="rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100 hover:bg-zinc-100">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] text-zinc-500">{n.content}</p>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Últimos pedidos"
          action={
            <ButtonLink href="/r/pedidos" variant="ghost" size="sm">
              Ver todos <ArrowRight />
            </ButtonLink>
          }
        />
        {recent.length === 0 ? (
          <EmptyState icon={<Package />} title="Nenhum pedido ainda" description="Vendeu no marketplace? Faça o pedido aqui e anexe a etiqueta." action={<ButtonLink href="/r/pedidos/novo">Fazer primeiro pedido</ButtonLink>} />
        ) : (
          <div className="divide-y divide-zinc-100">
            {recent.map((o) => (
              <Link key={o.id} href={`/r/pedidos/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold">#{orderCode(o.number)}</p>
                  <p className="text-xs text-zinc-500">
                    {o.customerName || o.externalOrderId || "Pedido"} · {timeAgo(o.createdAt)}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">{brl(o.total)}</span>
                <OrderStatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
