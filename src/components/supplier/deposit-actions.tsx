"use client";

import { useState } from "react";
import { toast } from "sonner";
import { approveDeposit, rejectDeposit } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { useAction } from "@/components/ui/use-action";
import { brl } from "@/lib/format";

export function DepositActions({ id, amount }: { id: string; amount: number }) {
  const [open, setOpen] = useState<"approve" | "reject" | null>(null);
  const [value, setValue] = useState(amount);
  const [reason, setReason] = useState("");
  const { exec, pending } = useAction();
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="secondary" onClick={() => setOpen("reject")}>
        Recusar
      </Button>
      <Button size="sm" onClick={() => setOpen("approve")}>
        Aprovar
      </Button>
      <Modal
        open={open === "approve"}
        onClose={() => setOpen(null)}
        title="Aprovar depósito"
        description="Confira no seu banco se o PIX entrou. Você pode corrigir o valor."
        footer={
          <Button
            className="w-full"
            loading={pending}
            onClick={() =>
              exec(() => approveDeposit(id, value), {
                silent: true,
                onSuccess: (d) => {
                  toast.success(`Depósito de ${brl(value)} aprovado${d?.paid ? `. ${d.paid} pedido(s) pagos.` : ""}`);
                  setOpen(null);
                },
              })
            }
          >
            Aprovar {brl(value)}
          </Button>
        }
      >
        <Field label="Valor recebido">
          <MoneyInput value={value} onChange={setValue} />
        </Field>
      </Modal>
      <Modal
        open={open === "reject"}
        onClose={() => setOpen(null)}
        title="Recusar depósito"
        footer={
          <Button variant="danger" className="w-full" loading={pending} onClick={() => exec(() => rejectDeposit(id, reason), { onSuccess: () => setOpen(null) })}>
            Recusar
          </Button>
        }
      >
        <Field label="Motivo (o revendedor verá)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: PIX não identificado" />
        </Field>
      </Modal>
    </div>
  );
}
