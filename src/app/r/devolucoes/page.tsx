import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Undo2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, ReturnStatusBadge } from "@/components/ui/misc";
import { db, returns } from "@/db";
import { requireReseller } from "@/lib/auth";
import { brl, formatDateTime, orderCode } from "@/lib/format";

export const metadata = { title: "Devoluções" };

export default async function ResellerReturns() {
  const { reseller } = await requireReseller();
  const list = await db.query.returns.findMany({
    where: eq(returns.resellerId, reseller.id),
    orderBy: desc(returns.createdAt),
    limit: 100,
    with: { order: { columns: { id: true, number: true } } },
  });
  return (
    <>
      <PageHeader title="Devoluções" description="Para solicitar, abra um pedido enviado e toque em Solicitar devolução." />
      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={<Undo2 />} title="Nenhuma devolução" />
        ) : (
          <div className="divide-y divide-zinc-100">
            {list.map((r) => (
              <Link key={r.id} href={`/r/pedidos/${r.order.id}`} className="block px-4 py-3.5 hover:bg-zinc-50 sm:px-5">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      Pedido <span className="font-mono">#{orderCode(r.order.number)}</span>
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {r.reason} · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{brl(r.refundAmount ?? r.requestedAmount)}</span>
                  <ReturnStatusBadge status={r.status} />
                </div>
                {r.supplierNote && <p className="mt-2 rounded-xl bg-zinc-50 p-2.5 text-[13px] whitespace-pre-wrap text-zinc-600 ring-1 ring-zinc-100">{r.supplierNote}</p>}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
