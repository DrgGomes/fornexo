"use client";

import { useState } from "react";
import { Ban, CircleDollarSign, Printer, Upload } from "lucide-react";
import { supplierCancel, supplierMarkPaid, supplierSetStatus, supplierUpdateOrder, supplierUploadLabel } from "@/actions/supplier-orders";
import type { OrderStatus } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/ui/file-picker";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";
import { ORDER_FLOW, ORDER_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SupplierStatusControl({ id, status, paid }: { id: string; status: OrderStatus; paid: boolean }) {
  const { exec, pending } = useAction();
  const [target, setTarget] = useState<OrderStatus | null>(null);
  if (status === "CANCELED") return null;
  if (!paid) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-zinc-600">O pedido ainda não foi pago pelo saldo do revendedor.</p>
        <Button
          variant="dark"
          loading={pending}
          onClick={() => confirm("Confirmar que você recebeu o pagamento deste pedido por fora do sistema?") && exec(() => supplierMarkPaid(id))}
        >
          <CircleDollarSign /> Marcar como pago
        </Button>
      </div>
    );
  }
  const idx = ORDER_FLOW.indexOf(status);
  const next = ORDER_FLOW[idx + 1];
  return (
    <div className="flex flex-col gap-3">
      {next && (
        <Button
          size="lg"
          loading={pending && target === next}
          onClick={() => {
            setTarget(next);
            exec(() => supplierSetStatus(id, next));
          }}
          className="w-full"
        >
          Avançar para: {ORDER_STATUS[next].label}
        </Button>
      )}
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {ORDER_FLOW.map((s) => (
          <button
            key={s}
            disabled={pending}
            onClick={() => {
              setTarget(s);
              exec(() => supplierSetStatus(id, s));
            }}
            className={cn(
              "h-9 rounded-xl text-[12px] font-medium ring-1 transition",
              s === status ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-600 ring-zinc-200 hover:bg-zinc-50",
            )}
          >
            {ORDER_STATUS[s].short}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SupplierOrderTools({
  id,
  status,
  trackingCode,
  supplierNotes,
  hasLabel,
}: {
  id: string;
  status: OrderStatus;
  trackingCode: string | null;
  supplierNotes: string | null;
  hasLabel: boolean;
}) {
  const { exec, pending } = useAction();
  const [tracking, setTracking] = useState(trackingCode ?? "");
  const [notes, setNotes] = useState(supplierNotes ?? "");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [labelOpen, setLabelOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const canCancel = !["CANCELED", "SHIPPED", "DELIVERED"].includes(status);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <a href={`/print/pedidos?ids=${id}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium ring-1 ring-zinc-200 hover:bg-zinc-50">
          <Printer className="size-4" /> Imprimir cupom
        </a>
        <Button variant="secondary" onClick={() => setLabelOpen(true)}>
          <Upload /> {hasLabel ? "Trocar etiqueta" : "Anexar etiqueta"}
        </Button>
      </div>
      <Field label="Código de rastreio">
        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Opcional" />
      </Field>
      <Field label="Observação interna" hint="Visível apenas para sua equipe">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" />
      </Field>
      <Button variant="dark" loading={pending} onClick={() => exec(() => supplierUpdateOrder(id, { trackingCode: tracking, supplierNotes: notes }))}>
        Salvar
      </Button>
      {canCancel && (
        <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setCancelOpen(true)}>
          <Ban /> Cancelar pedido
        </Button>
      )}

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar pedido"
        description="O estoque volta para o produto e, se pago, o valor é estornado para o saldo do revendedor."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button variant="danger" loading={pending} onClick={() => exec(() => supplierCancel(id, reason), { onSuccess: () => setCancelOpen(false) })}>
              Cancelar pedido
            </Button>
          </div>
        }
      >
        <Field label="Motivo (o revendedor verá)">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: produto sem estoque" />
        </Field>
      </Modal>

      <Modal
        open={labelOpen}
        onClose={() => setLabelOpen(false)}
        title="Etiqueta de envio"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLabelOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={pending}
              disabled={!file}
              onClick={() => {
                if (!file) return;
                const fd = new FormData();
                fd.set("orderId", id);
                fd.set("file", file);
                exec(() => supplierUploadLabel(fd), {
                  onSuccess: () => {
                    setLabelOpen(false);
                    setFile(null);
                  },
                });
              }}
            >
              Enviar etiqueta
            </Button>
          </div>
        }
      >
        <FilePicker file={file} onChange={setFile} label="Selecionar etiqueta" />
      </Modal>
    </div>
  );
}
