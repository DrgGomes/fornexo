import { desc, eq } from "drizzle-orm";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { AddFunds } from "@/components/reseller/add-funds";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { db, deposits, transactions } from "@/db";
import { requireReseller } from "@/lib/auth";
import { TX_LABEL } from "@/lib/constants";
import { brl, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Carteira" };

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ valor?: string }> }) {
  const { reseller, supplier } = await requireReseller();
  const sp = await searchParams;
  const [deps, txs] = await Promise.all([
    db.query.deposits.findMany({ where: eq(deposits.resellerId, reseller.id), orderBy: desc(deposits.createdAt), limit: 20 }),
    db.query.transactions.findMany({ where: eq(transactions.resellerId, reseller.id), orderBy: desc(transactions.createdAt), limit: 60 }),
  ]);
  const pending = deps.filter((d) => d.status === "PENDING");
  const pix = supplier.pixKey ? { key: supplier.pixKey, holder: supplier.pixHolder || supplier.name, city: supplier.pixCity || supplier.city || "Brasil" } : null;
  const initial = Number(sp.valor) > 0 ? Math.ceil(Number(sp.valor)) : undefined;

  return (
    <>
      <PageHeader title="Carteira" description="Saldo pré-pago para seus pedidos serem confirmados na hora" />
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900 p-6 text-white sm:p-8">
        <div className="absolute -top-20 -right-16 size-64 rounded-full bg-brand/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <Wallet className="size-4" /> Saldo disponível
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{brl(reseller.balance)}</p>
            {pending.length > 0 && (
              <p className="mt-2 text-sm text-amber-300">
                {brl(pending.reduce((s, d) => s + d.amount, 0))} em análise pelo fornecedor
              </p>
            )}
          </div>
          <AddFunds pix={pix} initialAmount={initial} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Extrato"
            action={
              <a href="/api/export/extrato" className="text-[13px] font-medium text-brand hover:underline">
                Exportar
              </a>
            }
          />
          {txs.length === 0 ? (
            <EmptyState icon={<Wallet />} title="Sem movimentações" description="Adicione saldo para começar." />
          ) : (
            <div className="divide-y divide-zinc-100">
              {txs.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", t.amount >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-600")}>
                    {t.amount >= 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
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
                    <p className="text-[11px] text-zinc-400 tabular-nums">{brl(t.balanceAfter)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="self-start overflow-hidden">
          <CardHeader title="Depósitos enviados" />
          {deps.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-zinc-500">Nenhum depósito ainda.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {deps.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tabular-nums">{brl(d.amount)}</p>
                    <p className="text-xs text-zinc-500">{formatDateTime(d.createdAt)}</p>
                    {d.rejectReason && <p className="text-xs text-red-600">{d.rejectReason}</p>}
                  </div>
                  {d.status === "PENDING" ? <Badge tone="amber">Em análise</Badge> : d.status === "APPROVED" ? <Badge tone="emerald">Aprovado</Badge> : <Badge tone="red">Recusado</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
