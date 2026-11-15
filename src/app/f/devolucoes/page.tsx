import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, ReturnStatusBadge, TabLinks } from "@/components/ui/misc";
import { db, returns, type ReturnStatus } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { brl, orderCode, timeAgo } from "@/lib/format";

export const metadata = { title: "Devoluções" };

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supplier } = await requireSupplier();
  const sp = await searchParams;
  const st = (["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"].includes(sp.status ?? "") ? sp.status : undefined) as ReturnStatus | undefined;
  const [list, counts] = await Promise.all([
    db.query.returns.findMany({
      where: and(eq(returns.supplierId, supplier.id), st ? eq(returns.status, st) : undefined),
      orderBy: desc(returns.createdAt),
      limit: 200,
      with: { order: { columns: { number: true } }, reseller: { columns: { name: true, storeName: true } } },
    }),
    db.select({ s: returns.status, n: count() }).from(returns).where(eq(returns.supplierId, supplier.id)).groupBy(returns.status),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.s, x.n]));
  return (
    <>
      <PageHeader title="Devoluções" description="Solicitações dos revendedores" />
      <TabLinks
        items={[
          { href: "/f/devolucoes", label: "Todas", active: !st },
          { href: "/f/devolucoes?status=REQUESTED", label: "Solicitadas", count: c.REQUESTED, active: st === "REQUESTED" },
          { href: "/f/devolucoes?status=APPROVED", label: "Aguardando produto", count: c.APPROVED, active: st === "APPROVED" },
          { href: "/f/devolucoes?status=COMPLETED", label: "Concluídas", active: st === "COMPLETED" },
          { href: "/f/devolucoes?status=REJECTED", label: "Recusadas", active: st === "REJECTED" },
        ]}
      />
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={<Undo2 />} title="Nenhuma devolução" description="Quando um revendedor solicitar devolução de um pedido enviado, ela aparece aqui." />
        ) : (
          <div className="divide-y divide-zinc-100">
            {list.map((r) => (
              <Link key={r.id} href={`/f/devolucoes/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    Pedido <span className="font-mono">#{orderCode(r.order.number)}</span>
                    <span className="font-normal text-zinc-500"> · {r.reseller.storeName || r.reseller.name}</span>
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {r.reason} · {timeAgo(r.createdAt)}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">{brl(r.refundAmount ?? r.requestedAmount)}</span>
                <ReturnStatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
