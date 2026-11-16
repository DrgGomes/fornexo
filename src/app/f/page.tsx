import Link from "next/link";
import { and, count, desc, eq, gte, ne, sql, sum } from "drizzle-orm";
import { AlertTriangle, ArrowRight, CircleCheck, Circle, Package, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { RevenueChart } from "@/components/charts/area-chart";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState, OrderStatusBadge, PageHeader, ProductThumb, StatCard } from "@/components/ui/misc";
import { db, orderItems, orders, products, resellers, variants } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/constants";
import { supplierCounts } from "@/lib/counts";
import { brl, orderCode, startOfMonthSP, startOfTodaySP, timeAgo } from "@/lib/format";
import { dailySeries } from "@/lib/stats";
import { baseUrl } from "@/lib/url";
import type { OrderStatus } from "@/db/schema";
import { safeColor } from "@/lib/utils";

export const metadata = { title: "Início" };

export default async function SupplierHome() {
  const { supplier, user } = await requireSupplier();
  const sid = supplier.id;
  const today = startOfTodaySP();
  const month = startOfMonthSP();
  const notCanceled = ne(orders.status, "CANCELED");

  const [todayAgg, monthAgg, byStatus, series, topProducts, recent, lowStock, counts, productCount, resellerCount, origin] = await Promise.all([
    db.select({ n: count(), total: sum(orders.total) }).from(orders).where(and(eq(orders.supplierId, sid), notCanceled, gte(orders.createdAt, today))),
    db
      .select({ n: count(), total: sum(orders.total), cost: sum(orders.itemsCost) })
      .from(orders)
      .where(and(eq(orders.supplierId, sid), notCanceled, gte(orders.createdAt, month))),
    db.select({ status: orders.status, n: count() }).from(orders).where(eq(orders.supplierId, sid)).groupBy(orders.status),
    dailySeries({ supplierId: sid, days: 30 }),
    db
      .select({ name: orderItems.productName, image: sql<string | null>`max(${orderItems.imageUrl})`, qty: sum(orderItems.quantity), total: sum(orderItems.total) })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.supplierId, sid), notCanceled, gte(orders.createdAt, month)))
      .groupBy(orderItems.productName)
      .orderBy(desc(sum(orderItems.quantity)))
      .limit(5),
    db.query.orders.findMany({
      where: eq(orders.supplierId, sid),
      orderBy: desc(orders.createdAt),
      limit: 6,
      with: { reseller: { columns: { name: true, storeName: true } } },
    }),
    db
      .select({ id: products.id, name: products.name, image: sql<string | null>`${products.images}[1]`, variant: variants.name, hasVariants: products.hasVariants, stock: variants.stock })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(products.supplierId, sid), eq(products.status, "ACTIVE"), sql`${variants.stock} <= ${products.lowStockAlert}`))
      .orderBy(variants.stock)
      .limit(6),
    supplierCounts(sid),
    db.select({ n: count() }).from(products).where(eq(products.supplierId, sid)),
    db.select({ n: count() }).from(resellers).where(eq(resellers.supplierId, sid)),
    baseUrl(),
  ]);

  const statusCount = Object.fromEntries(byStatus.map((s) => [s.status, s.n])) as Partial<Record<OrderStatus, number>>;
  const monthTotal = Number(monthAgg[0].total ?? 0);
  const monthOrders = monthAgg[0].n;
  const profit = monthTotal - Number(monthAgg[0].cost ?? 0);
  const signupLink = `${origin}/v/${supplier.slug}/cadastro`;

  const checklist = [
    { done: productCount[0].n > 0, label: "Cadastre o primeiro produto", href: "/f/produtos/novo" },
    { done: !!supplier.pixKey, label: "Configure sua chave PIX para receber", href: "/f/configuracoes?tab=pagamento" },
    { done: !!supplier.landing || !!supplier.logoUrl, label: "Personalize sua página de cadastro", href: "/f/minha-pagina" },
    { done: resellerCount[0].n > 0, label: "Convide seu primeiro revendedor", href: "/f/revendedores" },
  ];
  const pendingSteps = checklist.filter((c) => !c.done).length;

  const pipeline: OrderStatus[] = ["AWAITING_PAYMENT", "CONFIRMED", "PICKING", "PICKED", "PACKED", "SHIPPED"];

  return (
    <>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        description="Resumo da operação de hoje"
        actions={
          <>
            <ButtonLink href="/f/bipagem" variant="secondary">
              Bipar pedidos
            </ButtonLink>
            <ButtonLink href="/f/produtos/novo">Novo produto</ButtonLink>
          </>
        }
      />

      {pendingSteps > 0 && (
        <Card className="mb-5 overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1fr_1.2fr]">
            <div className="bg-zinc-900 p-5 text-white sm:p-6">
              <p className="text-[13px] font-medium text-zinc-400">Primeiros passos</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">Deixe sua operação pronta para vender</h2>
              <p className="mt-2 text-sm text-zinc-400">Compartilhe seu link de cadastro com revendedores:</p>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 p-1.5 pl-3">
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-200">{signupLink}</span>
                <CopyButton text={signupLink} label="Copiar" className="bg-white text-zinc-900 hover:bg-zinc-100" />
              </div>
            </div>
            <div className="divide-y divide-zinc-100">
              {checklist.map((c) => (
                <Link key={c.label} href={c.href} className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-zinc-50">
                  {c.done ? <CircleCheck className="size-5 text-emerald-500" /> : <Circle className="size-5 text-zinc-300" />}
                  <span className={c.done ? "text-zinc-400 line-through" : "font-medium"}>{c.label}</span>
                  {!c.done && <ArrowRight className="ml-auto size-4 text-zinc-400" />}
                </Link>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard accent label="Faturamento hoje" value={brl(Number(todayAgg[0].total ?? 0))} hint={`${todayAgg[0].n} pedidos`} icon={<TrendingUp />} />
        <StatCard label="Faturamento no mês" value={brl(monthTotal)} hint={`${monthOrders} pedidos`} icon={<ReceiptText />} href="/f/financeiro" />
        <StatCard label="Lucro estimado (mês)" value={brl(profit)} hint="Vendas menos custo dos produtos" icon={<Wallet />} />
        <StatCard label="Ticket médio" value={brl(monthOrders ? Math.round(monthTotal / monthOrders) : 0)} hint="Neste mês" icon={<Package />} />
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
        {pipeline.map((s) => (
          <Link
            key={s}
            href={`/f/pedidos?status=${s}`}
            className="min-w-[132px] rounded-2xl bg-white p-3.5 ring-1 ring-zinc-200/70 transition hover:ring-zinc-300"
          >
            <OrderStatusBadge status={s} />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{statusCount[s] ?? 0}</p>
            <p className="text-xs text-zinc-500">{ORDER_STATUS[s].label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Faturamento" description="Últimos 30 dias" />
          <CardBody>
            <RevenueChart data={series} color={safeColor(supplier.primaryColor)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pendências" />
          <CardBody className="flex flex-col gap-2">
            {[
              { n: counts.pendingDeposits, label: "Depósitos para aprovar", href: "/f/financeiro?tab=depositos" },
              { n: counts.pendingReturns, label: "Devoluções solicitadas", href: "/f/devolucoes" },
              { n: counts.pendingResellers, label: "Revendedores aguardando", href: "/f/revendedores?status=PENDING" },
              { n: counts.unreadMsgs, label: "Mensagens não lidas", href: "/f/mensagens" },
              { n: lowStock.length, label: "Itens com estoque baixo", href: "/f/estoque?baixo=1" },
            ].map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className="flex items-center justify-between rounded-xl bg-zinc-50 px-3.5 py-3 text-sm ring-1 ring-zinc-100 transition hover:bg-zinc-100"
              >
                <span className="text-zinc-700">{p.label}</span>
                <span
                  className={
                    p.n > 0 ? "rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white tabular-nums" : "text-xs text-zinc-400"
                  }
                >
                  {p.n}
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pedidos recentes"
            action={
              <ButtonLink href="/f/pedidos" variant="ghost" size="sm">
                Ver todos <ArrowRight />
              </ButtonLink>
            }
          />
          {recent.length === 0 ? (
            <EmptyState icon={<ReceiptText />} title="Nenhum pedido ainda" description="Os pedidos dos revendedores aparecem aqui." />
          ) : (
            <div className="divide-y divide-zinc-100">
              {recent.map((o) => (
                <Link key={o.id} href={`/f/pedidos/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      #{orderCode(o.number)} <span className="font-normal text-zinc-500">· {o.reseller.storeName || o.reseller.name}</span>
                    </p>
                    <p className="text-xs text-zinc-500">{timeAgo(o.createdAt)}</p>
                  </div>
                  <span className="hidden text-sm font-medium tabular-nums sm:block">{brl(o.total)}</span>
                  <OrderStatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Mais vendidos" description="Neste mês" />
            <CardBody className="flex flex-col gap-3">
              {topProducts.length === 0 && <p className="text-sm text-zinc-500">Sem vendas no mês.</p>}
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-semibold text-zinc-400">{i + 1}</span>
                  <ProductThumb src={p.image} alt={p.name} size={36} />
                  <p className="min-w-0 flex-1 truncate text-sm">{p.name}</p>
                  <span className="text-sm font-semibold tabular-nums">{Number(p.qty)} un</span>
                </div>
              ))}
            </CardBody>
          </Card>

          {lowStock.length > 0 && (
            <Card>
              <CardHeader title="Estoque baixo" action={<AlertTriangle className="size-4 text-amber-500" />} />
              <CardBody className="flex flex-col gap-2.5">
                {lowStock.map((p, i) => (
                  <Link key={i} href={`/f/produtos/${p.id}`} className="flex items-center gap-3">
                    <ProductThumb src={p.image} alt={p.name} size={32} />
                    <p className="min-w-0 flex-1 truncate text-sm">
                      {p.name}
                      {p.hasVariants && <span className="text-zinc-500"> · {p.variant}</span>}
                    </p>
                    <span className={p.stock <= 0 ? "text-sm font-semibold text-red-600" : "text-sm font-semibold text-amber-600"}>{p.stock}</span>
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
