import Link from "next/link";
import { and, count, desc, eq, ne, sum } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { BalanceAdjuster, ResellerNotes, ResellerStatusButtons } from "@/components/supplier/reseller-tools";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, KeyValue, OrderStatusBadge, PageHeader, StatCard } from "@/components/ui/misc";
import { db, orders, resellers, transactions } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { marketplaceLabel, TX_LABEL } from "@/lib/constants";
import { brl, formatDate, formatDateTime, orderCode } from "@/lib/format";
import { cn, whatsappLink } from "@/lib/utils";

export const metadata = { title: "Revendedor" };

export default async function ResellerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supplier } = await requireSupplier();
  const r = await db.query.resellers.findFirst({
    where: and(eq(resellers.id, id), eq(resellers.supplierId, supplier.id)),
    with: { user: { columns: { email: true, lastLoginAt: true } } },
  });
  if (!r) notFound();
  const [agg, recent, txs] = await Promise.all([
    db.select({ n: count(), total: sum(orders.total) }).from(orders).where(and(eq(orders.resellerId, r.id), ne(orders.status, "CANCELED"))),
    db.query.orders.findMany({ where: eq(orders.resellerId, r.id), orderBy: desc(orders.createdAt), limit: 10 }),
    db.query.transactions.findMany({ where: eq(transactions.resellerId, r.id), orderBy: desc(transactions.createdAt), limit: 15 }),
  ]);
  const wa = whatsappLink(r.phone);
  const n = agg[0].n;
  const total = Number(agg[0].total ?? 0);

  return (
    <>
      <PageHeader
        back="/f/revendedores"
        title={
          <span className="flex items-center gap-3">
            <Avatar name={r.storeName || r.name} size={40} />
            <span className="min-w-0">
              <span className="block truncate">{r.storeName || r.name}</span>
            </span>
            {r.status === "PENDING" && <Badge tone="amber">Aguardando</Badge>}
            {r.status === "BLOCKED" && <Badge tone="red">Bloqueado</Badge>}
          </span>
        }
        actions={<ResellerStatusButtons id={r.id} status={r.status} />}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard accent label="Saldo" value={brl(r.balance)} />
        <StatCard label="Pedidos" value={n} />
        <StatCard label="Total comprado" value={brl(total)} />
        <StatCard label="Ticket médio" value={brl(n ? Math.round(total / n) : 0)} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader
              title="Pedidos recentes"
              action={
                <ButtonLink href={`/f/pedidos?tab=todos&rid=${r.id}`} variant="ghost" size="sm">
                  Ver todos
                </ButtonLink>
              }
            />
            <div className="divide-y divide-zinc-100">
              {recent.length === 0 && <p className="px-5 pb-5 text-sm text-zinc-500">Nenhum pedido.</p>}
              {recent.map((o) => (
                <Link key={o.id} href={`/f/pedidos/${o.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">#{orderCode(o.number)}</p>
                    <p className="text-xs text-zinc-500">
                      {marketplaceLabel(o.marketplace)} · {formatDateTime(o.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{brl(o.total)}</span>
                  <OrderStatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader
              title="Extrato"
              action={
                <a href={`/api/export/extrato?rid=${r.id}`} className="text-[13px] font-medium text-brand hover:underline">
                  Exportar CSV
                </a>
              }
            />
            <div className="divide-y divide-zinc-100">
              {txs.length === 0 && <p className="px-5 pb-5 text-sm text-zinc-500">Sem movimentações.</p>}
              {txs.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="text-xs text-zinc-500">
                      {TX_LABEL[t.type]} · {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold tabular-nums", t.amount >= 0 ? "text-emerald-600" : "text-zinc-900")}>
                      {t.amount >= 0 ? "+" : ""}
                      {brl(t.amount)}
                    </p>
                    <p className="text-xs text-zinc-400 tabular-nums">saldo {brl(t.balanceAfter)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Dados" />
            <CardBody className="divide-y divide-zinc-100 pt-0">
              <KeyValue label="Nome">{r.name}</KeyValue>
              <KeyValue label="E-mail">{r.user?.email ?? "-"}</KeyValue>
              <KeyValue label="WhatsApp">{r.phone || "-"}</KeyValue>
              {r.document && <KeyValue label="CPF/CNPJ">{r.document}</KeyValue>}
              <KeyValue label="Canais">{r.marketplaces.length ? r.marketplaces.map(marketplaceLabel).join(", ") : "-"}</KeyValue>
              <KeyValue label="Cadastro">{formatDate(r.createdAt)}</KeyValue>
              <KeyValue label="Último acesso">{r.user?.lastLoginAt ? formatDateTime(r.user.lastLoginAt) : "-"}</KeyValue>
              <div className="flex gap-2 pt-3">
                <Link href={`/f/mensagens/${r.id}`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium ring-1 ring-zinc-200 hover:bg-zinc-50">
                  <MessageCircle className="size-4" /> Chat
                </Link>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-emerald-600 text-sm font-medium text-white">
                    WhatsApp
                  </a>
                )}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Saldo" description="Créditos pagam pedidos pendentes automaticamente" />
            <CardBody>
              <BalanceAdjuster id={r.id} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Anotações internas" />
            <CardBody>
              <ResellerNotes id={r.id} notes={r.notes} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
