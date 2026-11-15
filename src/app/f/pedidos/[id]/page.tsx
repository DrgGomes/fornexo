import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Download, ExternalLink, FileWarning, MessageCircle } from "lucide-react";
import { OrderItemsList, OrderProgress, OrderTimeline } from "@/components/orders/order-parts";
import { SupplierOrderTools, SupplierStatusControl } from "@/components/supplier/order-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { KeyValue, OrderStatusBadge, PageHeader, ReturnStatusBadge } from "@/components/ui/misc";
import { db, orderEvents, orderItems, orders, returns } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { marketplaceLabel } from "@/lib/constants";
import { brl, formatDateTime, orderCode } from "@/lib/format";
import { whatsappLink } from "@/lib/utils";

export const metadata = { title: "Pedido" };

export default async function SupplierOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supplier } = await requireSupplier();
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.supplierId, supplier.id)),
    with: {
      items: { orderBy: asc(orderItems.id) },
      events: { orderBy: desc(orderEvents.createdAt) },
      reseller: { with: { user: { columns: { email: true } } } },
      labelFile: { columns: { id: true, name: true, mimeType: true } },
      returns: { orderBy: desc(returns.createdAt) },
    },
  });
  if (!order) notFound();
  const r = order.reseller;
  const wa = whatsappLink(r.phone, `Olá! Sobre o pedido #${orderCode(order.number)}:`);

  return (
    <>
      <PageHeader
        back="/f/pedidos"
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">#{orderCode(order.number)}</span>
            <OrderStatusBadge status={order.status} />
            {order.paid ? <Badge tone="emerald">Pago</Badge> : <Badge tone="amber">Não pago</Badge>}
          </span>
        }
        description={`Criado em ${formatDateTime(order.createdAt)}`}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardBody className="pt-5">
              <OrderProgress status={order.status} />
              <div className="mt-5">
                <SupplierStatusControl id={order.id} status={order.status} paid={order.paid} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Etiqueta do cliente final" />
            <CardBody>
              {order.labelFile ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-white text-xs font-bold text-zinc-500 ring-1 ring-zinc-200">
                      {order.labelFile.mimeType.includes("pdf") ? "PDF" : "IMG"}
                    </span>
                    <p className="min-w-0 truncate text-sm font-medium">{order.labelFile.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/api/files/${order.labelFile.id}`} target="_blank" rel="noreferrer" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white">
                      <ExternalLink className="size-4" /> Abrir
                    </a>
                    <a href={`/api/files/${order.labelFile.id}?download=1`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-medium ring-1 ring-zinc-200">
                      <Download className="size-4" /> Baixar
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-3.5 text-sm text-orange-800 ring-1 ring-orange-100">
                  <FileWarning className="size-5 shrink-0" />
                  O revendedor ainda não anexou a etiqueta. Você pode anexar pelo menu ao lado ou pedir pelo chat.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Itens" description={`${order.items.reduce((s, i) => s + i.quantity, 0)} unidades`} />
            <CardBody>
              <OrderItemsList items={order.items} subtotal={order.subtotal} handlingFee={order.handlingFee} total={order.total} />
              {order.itemsCost > 0 && (
                <p className="mt-3 text-right text-xs text-zinc-500">
                  Custo dos produtos {brl(order.itemsCost)} · lucro estimado <span className="font-semibold text-emerald-600">{brl(order.total - order.itemsCost)}</span>
                </p>
              )}
            </CardBody>
          </Card>

          {order.returns.length > 0 && (
            <Card>
              <CardHeader title="Devoluções" />
              <CardBody className="flex flex-col gap-2">
                {order.returns.map((rt) => (
                  <Link key={rt.id} href={`/f/devolucoes/${rt.id}`} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 text-sm ring-1 ring-zinc-100 hover:bg-zinc-100">
                    <span>{rt.reason}</span>
                    <ReturnStatusBadge status={rt.status} />
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Histórico" />
            <CardBody>
              <OrderTimeline events={order.events} />
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Venda no marketplace" />
            <CardBody className="divide-y divide-zinc-100 pt-0">
              <KeyValue label="Canal">{marketplaceLabel(order.marketplace)}</KeyValue>
              <KeyValue label="Nº no marketplace">
                {order.externalOrderId ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="font-mono">{order.externalOrderId}</span>
                    <CopyButton text={order.externalOrderId} compact />
                  </span>
                ) : (
                  "-"
                )}
              </KeyValue>
              <KeyValue label="Cliente final">{order.customerName || "-"}</KeyValue>
              {order.trackingCode && <KeyValue label="Rastreio">{order.trackingCode}</KeyValue>}
              {order.notes && (
                <div className="py-2 text-sm">
                  <p className="text-zinc-500">Observação do revendedor</p>
                  <p className="mt-1 rounded-xl bg-amber-50 p-3 whitespace-pre-wrap text-amber-900 ring-1 ring-amber-100">{order.notes}</p>
                </div>
              )}
              {order.cancelReason && <KeyValue label="Motivo do cancelamento">{order.cancelReason}</KeyValue>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Revendedor"
              action={
                <Link href={`/f/revendedores/${r.id}`} className="text-[13px] font-medium text-brand hover:underline">
                  Ver perfil
                </Link>
              }
            />
            <CardBody className="divide-y divide-zinc-100 pt-0">
              <KeyValue label="Nome">{r.storeName || r.name}</KeyValue>
              <KeyValue label="E-mail">{r.user?.email ?? "-"}</KeyValue>
              <KeyValue label="Saldo atual">{brl(r.balance)}</KeyValue>
              <div className="flex gap-2 pt-3">
                <Link href={`/f/mensagens/${r.id}?pedido=${order.id}`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium ring-1 ring-zinc-200 hover:bg-zinc-50">
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
            <CardHeader title="Ações" />
            <CardBody>
              <SupplierOrderTools id={order.id} status={order.status} trackingCode={order.trackingCode} supplierNotes={order.supplierNotes} hasLabel={!!order.labelFile} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
