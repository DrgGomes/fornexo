import Link from "next/link";
import { and, count, desc, eq, gte, ne, sql, sum, type SQL } from "drizzle-orm";
import { ArrowDownLeft, ArrowUpRight, Banknote, PiggyBank, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { RevenueChart } from "@/components/charts/area-chart";
import { DepositActions } from "@/components/supplier/deposit-actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader, Pagination, StatCard, TabLinks } from "@/components/ui/misc";
import { db, deposits, orders, resellers, transactions } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { marketplaceLabel, TX_LABEL } from "@/lib/constants";
import { brl, daysAgoSP, formatDateTime, startOfMonthSP } from "@/lib/format";
import { dailySeries } from "@/lib/stats";
import { cn, safeColor } from "@/lib/utils";

export const metadata = { title: "Financeiro" };

const PERIODS = [
  { id: "7", label: "7 dias", days: 7 },
  { id: "30", label: "30 dias", days: 30 },
  { id: "90", label: "90 dias", days: 90 },
  { id: "mes", label: "Este mês", days: 0 },
];

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ tab?: string; p?: string; page?: string; type?: string }> }) {
  const { supplier } = await requireSupplier();
  const sp = await searchParams;
  const tab = sp.tab ?? "visao";
  const sid = supplier.id;
  const [pendingCount] = await db.select({ n: count() }).from(deposits).where(and(eq(deposits.supplierId, sid), eq(deposits.status, "PENDING")));

  const tabs = (
    <TabLinks
      items={[
        { href: "/f/financeiro?tab=visao", label: "Visão geral", active: tab === "visao" },
        { href: "/f/financeiro?tab=depositos", label: "Depósitos", count: pendingCount.n, active: tab === "depositos" },
        { href: "/f/financeiro?tab=extrato", label: "Movimentações", active: tab === "extrato" },
        { href: "/f/financeiro?tab=saldos", label: "Saldos dos revendedores", active: tab === "saldos" },
      ]}
    />
  );

  const header = (
    <PageHeader
      title="Financeiro"
      description="Vendas, depósitos via PIX e carteira dos revendedores"
      actions={
        <ButtonLink href="/api/export/extrato" variant="secondary" prefetch={false}>
          Exportar extrato
        </ButtonLink>
      }
    />
  );

  if (tab === "depositos") {
    const list = await db.query.deposits.findMany({
      where: eq(deposits.supplierId, sid),
      orderBy: [sql`case when ${deposits.status} = 'PENDING' then 0 else 1 end`, desc(deposits.createdAt)],
      limit: 100,
      with: { reseller: { columns: { name: true, storeName: true } } },
    });
    return (
      <>
        {header}
        {tabs}
        <Card className="overflow-hidden">
          {list.length === 0 ? (
            <EmptyState icon={<Banknote />} title="Nenhum depósito" description="Quando um revendedor enviar um comprovante PIX, ele aparece aqui para aprovação." />
          ) : (
            <div className="divide-y divide-zinc-100">
              {list.map((d) => (
                <div key={d.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={d.reseller.storeName || d.reseller.name} size={40} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{d.reseller.storeName || d.reseller.name}</p>
                      <p className="text-xs text-zinc-500">
                        {formatDateTime(d.createdAt)}
                        {d.note && ` · ${d.note}`}
                      </p>
                      {d.rejectReason && <p className="text-xs text-red-600">Motivo: {d.rejectReason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-base font-semibold tabular-nums">{brl(d.amount)}</span>
                    {d.proofFileId && (
                      <a href={`/api/files/${d.proofFileId}`} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-brand hover:underline">
                        Comprovante
                      </a>
                    )}
                    {d.status === "PENDING" ? (
                      <DepositActions id={d.id} amount={d.amount} />
                    ) : d.status === "APPROVED" ? (
                      <Badge tone="emerald">Aprovado</Badge>
                    ) : (
                      <Badge tone="red">Recusado</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </>
    );
  }

  if (tab === "extrato") {
    const page = Math.max(1, Number(sp.page) || 1);
    const conds: SQL[] = [eq(transactions.supplierId, sid)];
    if (sp.type && ["DEPOSIT", "ORDER_PAYMENT", "REFUND", "ADJUSTMENT"].includes(sp.type)) conds.push(eq(transactions.type, sp.type as "DEPOSIT"));
    const [rows, [{ n }]] = await Promise.all([
      db
        .select({ t: transactions, name: resellers.name, store: resellers.storeName })
        .from(transactions)
        .innerJoin(resellers, eq(resellers.id, transactions.resellerId))
        .where(and(...conds))
        .orderBy(desc(transactions.createdAt))
        .limit(50)
        .offset((page - 1) * 50),
      db.select({ n: count() }).from(transactions).where(and(...conds)),
    ]);
    return (
      <>
        {header}
        {tabs}
        <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {[{ id: "", label: "Todos" }, ...Object.entries(TX_LABEL).map(([id, label]) => ({ id, label }))].map((t) => (
            <Link
              key={t.id}
              href={`/f/financeiro?tab=extrato${t.id ? `&type=${t.id}` : ""}`}
              className={cn(
                "inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[13px] font-medium ring-1",
                (sp.type ?? "") === t.id ? "bg-brand/10 text-brand ring-brand/30" : "bg-white text-zinc-600 ring-zinc-200",
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <Card className="overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState icon={<ReceiptText />} title="Sem movimentações" />
          ) : (
            <div className="divide-y divide-zinc-100">
              {rows.map(({ t, name, store }) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", t.amount >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-600")}>
                    {t.amount >= 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {store || name} · {TX_LABEL[t.type]} · {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums", t.amount >= 0 ? "text-emerald-600" : "text-zinc-900")}>
                    {t.amount >= 0 ? "+" : ""}
                    {brl(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Pagination page={page} totalPages={Math.ceil(n / 50)} makeHref={(p) => `/f/financeiro?tab=extrato&page=${p}${sp.type ? `&type=${sp.type}` : ""}`} />
      </>
    );
  }

  if (tab === "saldos") {
    const rows = await db
      .select({ id: resellers.id, name: resellers.name, store: resellers.storeName, balance: resellers.balance, status: resellers.status })
      .from(resellers)
      .where(eq(resellers.supplierId, sid))
      .orderBy(desc(resellers.balance))
      .limit(500);
    const total = rows.reduce((s, r) => s + r.balance, 0);
    return (
      <>
        {header}
        {tabs}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard accent label="Saldo total em carteiras" value={brl(total)} hint="Valor pré-pago ainda não usado" />
          <StatCard label="Revendedores com saldo" value={rows.filter((r) => r.balance > 0).length} />
        </div>
        <Card className="overflow-hidden">
          <div className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <Link key={r.id} href={`/f/revendedores/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 sm:px-5">
                <Avatar name={r.store || r.name} size={36} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.store || r.name}</span>
                <span className={cn("text-sm font-semibold tabular-nums", r.balance > 0 ? "text-zinc-900" : "text-zinc-400")}>{brl(r.balance)}</span>
              </Link>
            ))}
          </div>
        </Card>
      </>
    );
  }

  // Visao geral
  const period = PERIODS.find((p) => p.id === sp.p) ?? PERIODS[1];
  const from = period.days ? daysAgoSP(period.days - 1) : startOfMonthSP();
  const days = period.days || Math.max(1, Math.ceil((Date.now() - from.getTime()) / 86400000));
  const nc = and(eq(orders.supplierId, sid), ne(orders.status, "CANCELED"), gte(orders.createdAt, from));
  const [agg, deps, refunds, wallets, byMkt, topResellers, series] = await Promise.all([
    db.select({ n: count(), total: sum(orders.total), cost: sum(orders.itemsCost), fees: sum(orders.handlingFee) }).from(orders).where(nc),
    db.select({ total: sum(deposits.amount), n: count() }).from(deposits).where(and(eq(deposits.supplierId, sid), eq(deposits.status, "APPROVED"), gte(deposits.reviewedAt, from))),
    db.select({ total: sum(transactions.amount) }).from(transactions).where(and(eq(transactions.supplierId, sid), eq(transactions.type, "REFUND"), gte(transactions.createdAt, from))),
    db.select({ total: sum(resellers.balance) }).from(resellers).where(eq(resellers.supplierId, sid)),
    db.select({ mkt: orders.marketplace, n: count(), total: sum(orders.total) }).from(orders).where(nc).groupBy(orders.marketplace).orderBy(desc(sum(orders.total))),
    db
      .select({ id: resellers.id, name: sql<string>`coalesce(${resellers.storeName}, ${resellers.name})`, n: count(), total: sum(orders.total) })
      .from(orders)
      .innerJoin(resellers, eq(resellers.id, orders.resellerId))
      .where(nc)
      .groupBy(resellers.id, resellers.storeName, resellers.name)
      .orderBy(desc(sum(orders.total)))
      .limit(6),
    dailySeries({ supplierId: sid, days }),
  ]);
  const revenue = Number(agg[0].total ?? 0);
  const profit = revenue - Number(agg[0].cost ?? 0);
  const maxMkt = Math.max(1, ...byMkt.map((m) => Number(m.total ?? 0)));

  return (
    <>
      {header}
      {tabs}
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        {PERIODS.map((p) => (
          <Link
            key={p.id}
            href={`/f/financeiro?tab=visao&p=${p.id}`}
            className={cn("inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[13px] font-medium ring-1", period.id === p.id ? "bg-brand/10 text-brand ring-brand/30" : "bg-white text-zinc-600 ring-zinc-200")}
          >
            {p.label}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard accent label="Faturamento" value={brl(revenue)} hint={`${agg[0].n} pedidos`} icon={<TrendingUp />} />
        <StatCard label="Lucro estimado" value={brl(profit)} hint={revenue ? `${((profit / revenue) * 100).toFixed(1)}% de margem` : "Cadastre o custo dos produtos"} icon={<PiggyBank />} />
        <StatCard label="Depósitos recebidos" value={brl(Number(deps[0].total ?? 0))} hint={`${deps[0].n} aprovados`} icon={<Banknote />} />
        <StatCard label="Saldo em carteiras" value={brl(Number(wallets[0].total ?? 0))} hint={`Estornos no período: ${brl(Number(refunds[0].total ?? 0))}`} icon={<Wallet />} />
      </div>
      <Card className="mt-5">
        <CardHeader title="Faturamento diário" description={period.label} />
        <CardBody>
          <RevenueChart data={series} color={safeColor(supplier.primaryColor)} height={260} />
        </CardBody>
      </Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Vendas por marketplace" />
          <CardBody className="flex flex-col gap-3">
            {byMkt.length === 0 && <p className="text-sm text-zinc-500">Sem vendas no período.</p>}
            {byMkt.map((m) => (
              <div key={m.mkt}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{marketplaceLabel(m.mkt)}</span>
                  <span className="tabular-nums text-zinc-600">
                    {brl(Number(m.total ?? 0))} · {m.n}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(Number(m.total ?? 0) / maxMkt) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Top revendedores" />
          <CardBody className="flex flex-col gap-3">
            {topResellers.length === 0 && <p className="text-sm text-zinc-500">Sem vendas no período.</p>}
            {topResellers.map((r, i) => (
              <Link key={r.id} href={`/f/revendedores/${r.id}`} className="flex items-center gap-3">
                <span className="w-4 text-xs font-semibold text-zinc-400">{i + 1}</span>
                <Avatar name={r.name} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
                <span className="text-sm font-semibold tabular-nums">{brl(Number(r.total ?? 0))}</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
