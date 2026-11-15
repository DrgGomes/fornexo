"use client";

import { useState } from "react";
import { completeReturn, reviewReturn } from "@/actions/returns";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/components/ui/use-action";

export function ReturnActions({ id, status, requestedAmount }: { id: string; status: string; requestedAmount: number }) {
  const [modal, setModal] = useState<"approve" | "reject" | "complete" | null>(null);
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState(requestedAmount);
  const [restock, setRestock] = useState(true);
  const { exec, pending } = useAction();
  const close = () => setModal(null);
  if (status === "COMPLETED" || status === "REJECTED") return null;
  return (
    <div className="flex flex-col gap-2">
      {status === "REQUESTED" && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setModal("reject")}>
            Recusar
          </Button>
          <Button onClick={() => setModal("approve")}>Aprovar</Button>
        </div>
      )}
      <Button variant={status === "APPROVED" ? "primary" : "secondary"} onClick={() => setModal("complete")}>
        Produto recebido: concluir e estornar
      </Button>

      <Modal
        open={modal === "approve" || modal === "reject"}
        onClose={close}
        title={modal === "approve" ? "Aprovar devolução" : "Recusar devolução"}
        footer={
          <Button
            className="w-full"
            variant={modal === "reject" ? "danger" : "primary"}
            loading={pending}
            onClick={() => exec(() => reviewReturn(id, modal === "approve" ? "APPROVED" : "REJECTED", note), { onSuccess: close })}
          >
            Confirmar
          </Button>
        }
      >
        <Field label={modal === "approve" ? "Instruções para o revendedor" : "Motivo da recusa"}>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={modal === "approve" ? "Ex: Envie o produto para Rua X, 123. Use o código de postagem do marketplace." : "Ex: Produto fora do prazo de devolução"}
          />
        </Field>
      </Modal>

      <Modal
        open={modal === "complete"}
        onClose={close}
        title="Concluir devolução"
        description="O valor estornado entra no saldo do revendedor na hora."
        footer={
          <Button className="w-full" loading={pending} onClick={() => exec(() => completeReturn(id, { refundAmount: refund, restock, note }), { onSuccess: close })}>
            Concluir devolução
          </Button>
        }
      >
        <div className="grid gap-4">
          <Field label="Valor a estornar" hint="Sugestão: valor dos itens devolvidos">
            <MoneyInput value={refund} onChange={setRefund} />
          </Field>
          <Switch checked={restock} onChange={setRestock} label="Devolver itens ao estoque" description="Use se o produto voltou em condições de venda" />
          <Field label="Observação (opcional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
