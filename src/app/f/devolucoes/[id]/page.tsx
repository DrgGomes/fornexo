import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ReturnActions } from "@/components/supplier/return-actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KeyValue, PageHeader, ProductThumb, ReturnStatusBadge } from "@/components/ui/misc";
import { db, returns } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { brl, formatDateTime, orderCode } from "@/lib/format";

export const metadata = { title: "Devolução" };

export default async function ReturnDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supplier } = await requireSupplier();
  const r = await db.query.returns.findFirst({
    where: and(eq(returns.id, id), eq(returns.supplierId, supplier.id)),
    with: { order: { with: { items: true } }, reseller: true },
  });
  if (!r) notFound();
  const items = r.items.map((it) => ({ ...it, oi: r.order.items.find((x) => x.id === it.orderItemId) }));
  return (
    <>
      <PageHeader
        back="/f/devolucoes"
        title={
          <span className="flex flex-wrap items-center gap-2">
            Devolução · <span className="font-mono">#{orderCode(r.order.number)}</span> <ReturnStatusBadge status={r.status} />
          </span>
        }
        description={`Solicitada em ${formatDateTime(r.createdAt)}`}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Motivo" />
            <CardBody>
              <p className="text-[15px] font-medium">{r.reason}</p>
              {r.details && <p className="mt-2 text-sm whitespace-pre-wrap text-zinc-600">{r.details}</p>}
              {r.photoFileIds.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {r.photoFileIds.map((fid) => (
                    <a key={fid} href={`/api/files/${fid}`} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/files/${fid}`} alt="Foto da devolução" className="size-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Itens devolvidos" />
            <CardBody className="divide-y divide-zinc-100">
              {items.map((it) => (
                <div key={it.orderItemId} className="flex items-center gap-3 py-3">
                  <ProductThumb src={it.oi?.imageUrl} alt="" size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{it.oi?.productName}</p>
                    <p className="text-xs text-zinc-500">
                      {it.oi?.variantName && `${it.oi.variantName} · `}
                      {it.oi?.sku}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{it.quantity} un</span>
                </div>
              ))}
            </CardBody>
          </Card>
          {r.supplierNote && (
            <Card>
              <CardHeader title="Sua resposta" />
              <CardBody>
                <p className="text-sm whitespace-pre-wrap">{r.supplierNote}</p>
              </CardBody>
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Resumo" />
            <CardBody className="divide-y divide-zinc-100 pt-0">
              <KeyValue label="Revendedor">
                <Link href={`/f/revendedores/${r.resellerId}`} className="text-brand hover:underline">
                  {r.reseller.storeName || r.reseller.name}
                </Link>
              </KeyValue>
              <KeyValue label="Pedido">
                <Link href={`/f/pedidos/${r.orderId}`} className="font-mono text-brand hover:underline">
                  #{orderCode(r.order.number)}
                </Link>
              </KeyValue>
              <KeyValue label="Valor dos itens">{brl(r.requestedAmount)}</KeyValue>
              {r.refundAmount !== null && <KeyValue label="Estornado">{brl(r.refundAmount)}</KeyValue>}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="pt-5">
              <ReturnActions id={r.id} status={r.status} requestedAmount={r.requestedAmount} />
              {(r.status === "COMPLETED" || r.status === "REJECTED") && <p className="text-sm text-zinc-500">Devolução finalizada em {formatDateTime(r.resolvedAt)}.</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
