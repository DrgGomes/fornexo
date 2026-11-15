import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ExternalLink, FileWarning, MessageCircle } from "lucide-react";
import { OrderItemsList, OrderProgress, OrderTimeline } from "@/components/orders/order-parts";
import { PayWithBalance, ResellerOrderTools } from "@/components/reseller/order-actions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { KeyValue, OrderStatusBadge, PageHeader, ReturnStatusBadge } from "@/components/ui/misc";
import { db, orderEvents, orderItems, orders, returns } from "@/db";
import { requireReseller } from "@/lib/auth";
import { LABEL_EDITABLE, marketplaceLabel, ORDER_STATUS, RESELLER_CANCELABLE } from "@/lib/constants";
import { formatDateTime, orderCode } from "@/lib/format";

export const metadata = { title: "Pedido" };

export default async function ResellerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { reseller } = await requireReseller();
  const o = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.resellerId, reseller.id)),
    with: {
      items: { orderBy: asc(orderItems.id) },
      events: { orderBy: desc(orderEvents.createdAt) },
      labelFile: { columns: { id: true, name: true } },
      returns: { orderBy: desc(returns.createdAt) },
    },
  });
  if (!o) notFound();
  const openReturn = o.returns.some((r) => r.status === "REQUESTED" || r.status === "APPROVED");
  return (
    <>
      <PageHeader
        back="/r/pedidos"
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">#{orderCode(o.number)}</span> <OrderStatusBadge status={o.status} />
          </span>
        }
        description={`${ORDER_STATUS[o.status].hint} · ${formatDateTime(o.createdAt)}`}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardBody className="pt-5">
              <OrderProgress status={o.status} />
              {o.status === "AWAITING_PAYMENT" && (
                <div className="mt-4 rounded-xl bg-amber-50 p-3.5 ring-1 ring-amber-100">
                  <PayWithBalance id={o.id} total={o.total} balance={reseller.balance} />
                </div>
              )}
              {o.trackingCode && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
                  <div>
                    <p className="text-xs text-zinc-500">Código de rastreio</p>
                    <p className="font-mono text-sm font-semibold">{o.trackingCode}</p>
                  </div>
                  <CopyButton text={o.trackingCode} />
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Itens" />
            <CardBody>
              <OrderItemsList items={o.items} subtotal={o.subtotal} handlingFee={o.handlingFee} total={o.total} />
            </CardBody>
          </Card>
          {o.returns.length > 0 && (
            <Card>
              <CardHeader title="Devoluções" />
              <CardBody className="flex flex-col gap-2">
                {o.returns.map((r) => (
                  <div key={r.id} className="rounded-xl bg-zinc-50 p-3 text-sm ring-1 ring-zinc-100">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{r.reason}</span>
                      <ReturnStatusBadge status={r.status} />
                    </div>
                    {r.supplierNote && <p className="mt-1.5 whitespace-pre-wrap text-zinc-600">Fornecedor: {r.supplierNote}</p>}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Histórico" />
            <CardBody>
              <OrderTimeline events={o.events} />
            </CardBody>
          </Card>
        </div>
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Etiqueta" />
            <CardBody>
              {o.labelFile ? (
                <a href={`/api/files/${o.labelFile.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 text-sm ring-1 ring-zinc-100 hover:bg-zinc-100">
                  <ExternalLink className="size-4 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate font-medium">{o.labelFile.name}</span>
                </a>
              ) : (
                <div className="flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-sm text-orange-800 ring-1 ring-orange-100">
                  <FileWarning className="mt-0.5 size-4 shrink-0" /> Anexe a etiqueta para o fornecedor conseguir enviar.
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Venda" />
            <CardBody className="divide-y divide-zinc-100 pt-0">
              <KeyValue label="Canal">{marketplaceLabel(o.marketplace)}</KeyValue>
              <KeyValue label="Nº marketplace">{o.externalOrderId || "-"}</KeyValue>
              <KeyValue label="Cliente">{o.customerName || "-"}</KeyValue>
              {o.notes && <KeyValue label="Observação">{o.notes}</KeyValue>}
              {o.cancelReason && <KeyValue label="Cancelamento">{o.cancelReason}</KeyValue>}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex flex-col gap-2 pt-5">
              <Link href={`/r/mensagens?pedido=${o.id}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium ring-1 ring-zinc-200 hover:bg-zinc-50">
                <MessageCircle className="size-4" /> Falar sobre este pedido
              </Link>
              <ResellerOrderTools
                id={o.id}
                hasLabel={!!o.labelFile}
                canCancel={RESELLER_CANCELABLE.includes(o.status)}
                canLabel={LABEL_EDITABLE.includes(o.status)}
                canReturn={(o.status === "SHIPPED" || o.status === "DELIVERED") && !openReturn}
                items={o.items.map((i) => ({ id: i.id, productName: i.productName, variantName: i.variantName, imageUrl: i.imageUrl, quantity: i.quantity, unitPrice: i.unitPrice }))}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
