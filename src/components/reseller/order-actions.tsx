"use client";

import { useState } from "react";
import { Ban, Upload, Undo2, Wallet } from "lucide-react";
import { cancelOrderByReseller, payOrderWithBalance, replaceLabel } from "@/actions/reseller";
import { createReturn } from "@/actions/returns";
import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/ui/file-picker";
import { LabelPicker } from "@/components/ui/label-picker";
import { Field, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ProductThumb } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";
import { RETURN_REASONS } from "@/lib/constants";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export function PayWithBalance({ id, total, balance }: { id: string; total: number; balance: number }) {
  const { exec, pending } = useAction();
  const enough = balance >= total;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm text-amber-900">
        {enough ? `Seu saldo (${brl(balance)}) cobre este pedido.` : `Faltam ${brl(total - balance)} no seu saldo para pagar este pedido.`}
      </p>
      {enough ? (
        <Button loading={pending} onClick={() => exec(() => payOrderWithBalance(id))}>
          <Wallet /> Pagar {brl(total)} com saldo
        </Button>
      ) : (
        <a href={`/r/carteira?valor=${total - balance}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-brand-fg">
          <Wallet className="size-4" /> Adicionar saldo
        </a>
      )}
    </div>
  );
}

export function ResellerOrderTools({
  id,
  canCancel,
  canLabel,
  canReturn,
  hasLabel,
  items,
}: {
  id: string;
  canCancel: boolean;
  canLabel: boolean;
  canReturn: boolean;
  hasLabel: boolean;
  items: { id: string; productName: string; variantName: string | null; imageUrl: string | null; quantity: number; unitPrice: number }[];
}) {
  const { exec, pending } = useAction();
  const [modal, setModal] = useState<"cancel" | "label" | "return" | null>(null);
  const [reason, setReason] = useState("");
  const [labelFiles, setLabelFiles] = useState<File[]>([]);
  const [rReason, setRReason] = useState(RETURN_REASONS[0]);
  const [details, setDetails] = useState("");
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, i.quantity])));
  const [photos, setPhotos] = useState<(File | null)[]>([null]);
  const close = () => setModal(null);

  if (!canCancel && !canLabel && !canReturn) return null;
  return (
    <div className="flex flex-col gap-2">
      {canLabel && (
        <Button variant="secondary" onClick={() => setModal("label")}>
          <Upload /> {hasLabel ? "Trocar etiqueta" : "Anexar etiqueta"}
        </Button>
      )}
      {canReturn && (
        <Button variant="secondary" onClick={() => setModal("return")}>
          <Undo2 /> Solicitar devolução
        </Button>
      )}
      {canCancel && (
        <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setModal("cancel")}>
          <Ban /> Cancelar pedido
        </Button>
      )}

      <Modal
        open={modal === "cancel"}
        onClose={close}
        title="Cancelar pedido"
        description="O valor pago volta para o seu saldo na hora."
        footer={
          <Button variant="danger" className="w-full" loading={pending} onClick={() => exec(() => cancelOrderByReseller(id, reason), { onSuccess: close })}>
            Cancelar pedido
          </Button>
        }
      >
        <Field label="Motivo (opcional)">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: cliente cancelou no marketplace" />
        </Field>
      </Modal>

      <Modal
        open={modal === "label"}
        onClose={close}
        title="Etiqueta de envio"
        footer={
          <Button
            className="w-full"
            loading={pending}
            disabled={!labelFiles.length}
            onClick={() => {
              const fd = new FormData();
              fd.set("orderId", id);
              labelFiles.forEach((f) => fd.append("file", f));
              exec(() => replaceLabel(fd), { onSuccess: () => (close(), setLabelFiles([])) });
            }}
          >
            Enviar etiqueta
          </Button>
        }
      >
        <LabelPicker files={labelFiles} onChange={setLabelFiles} />
      </Modal>

      <Modal
        open={modal === "return"}
        onClose={close}
        size="lg"
        title="Solicitar devolução"
        description="O fornecedor analisa e, ao receber o produto, estorna o valor no seu saldo."
        footer={
          <Button
            className="w-full"
            loading={pending}
            onClick={() => {
              const sel = Object.entries(qty)
                .filter(([, q]) => q > 0)
                .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
              if (!sel.length) return toast.error("Selecione ao menos um item");
              const fd = new FormData();
              fd.set("orderId", id);
              fd.set("reason", rReason);
              fd.set("details", details);
              fd.set("items", JSON.stringify(sel));
              photos.forEach((p) => p && fd.append("photos", p));
              exec(() => createReturn(fd), { onSuccess: close });
            }}
          >
            Enviar solicitação
          </Button>
        }
      >
        <div className="grid gap-4">
          <Field label="Motivo">
            <Select value={rReason} onChange={(e) => setRReason(e.target.value)}>
              {RETURN_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-medium text-zinc-700">Itens e quantidades</p>
            <div className="divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 p-2.5">
                  <ProductThumb src={it.imageUrl} alt="" size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.productName}</p>
                    {it.variantName && <p className="text-xs text-zinc-500">{it.variantName}</p>}
                  </div>
                  <Select value={qty[it.id]} onChange={(e) => setQty({ ...qty, [it.id]: Number(e.target.value) })} className="w-20">
                    {Array.from({ length: it.quantity + 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>
          <Field label="Detalhes">
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Descreva o que aconteceu" />
          </Field>
          <div className="grid gap-2">
            <p className="text-[13px] font-medium text-zinc-700">Fotos (opcional)</p>
            {photos.map((ph, i) => (
              <FilePicker
                key={i}
                file={ph}
                accept="image/png,image/jpeg,image/webp"
                label="Adicionar foto"
                hint="JPG ou PNG até 4 MB"
                onChange={(f) => {
                  const next = [...photos];
                  next[i] = f;
                  if (f && i === photos.length - 1 && photos.length < 4) next.push(null);
                  setPhotos(next.filter((x, j) => x || j === next.length - 1));
                }}
              />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
