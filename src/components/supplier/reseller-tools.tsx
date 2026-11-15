"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CircleCheck, Minus, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { adjustBalance, createResellerManually, saveResellerNotes, setResellerStatus } from "@/actions/supplier-resellers";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "@/components/ui/money-input";
import { useAction } from "@/components/ui/use-action";
import { cn } from "@/lib/utils";

export function ResellerStatusButtons({ id, status }: { id: string; status: string }) {
  const { exec, pending } = useAction();
  return (
    <div className="flex gap-2">
      {status !== "ACTIVE" && (
        <Button loading={pending} onClick={() => exec(() => setResellerStatus(id, "ACTIVE"))}>
          <CircleCheck /> {status === "PENDING" ? "Aprovar" : "Desbloquear"}
        </Button>
      )}
      {status !== "BLOCKED" && (
        <Button variant="secondary" loading={pending} onClick={() => confirm("Bloquear este revendedor? Ele perde o acesso ao portal.") && exec(() => setResellerStatus(id, "BLOCKED"))}>
          <Ban /> Bloquear
        </Button>
      )}
    </div>
  );
}

export function QuickApprove({ id }: { id: string }) {
  const { exec, pending } = useAction();
  return (
    <Button size="sm" loading={pending} onClick={(e) => (e.preventDefault(), exec(() => setResellerStatus(id, "ACTIVE")))}>
      Aprovar
    </Button>
  );
}

export function BalanceAdjuster({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState("");
  const { exec, pending } = useAction();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full">
        Ajustar saldo
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ajustar saldo"
        description="Crédito paga automaticamente pedidos que estejam aguardando pagamento."
        footer={
          <Button
            className="w-full"
            loading={pending}
            disabled={!amount}
            onClick={() =>
              exec(() => adjustBalance(id, kind === "credit" ? amount : -amount, desc), {
                silent: true,
                onSuccess: (d) => {
                  toast.success(d?.paid ? `Saldo ajustado. ${d.paid} pedido(s) pagos automaticamente.` : "Saldo ajustado");
                  setOpen(false);
                  setAmount(0);
                  setDesc("");
                },
              })
            }
          >
            Confirmar {kind === "credit" ? "crédito" : "débito"}
          </Button>
        }
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1">
            {(["credit", "debit"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn("flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium", kind === k ? "bg-white shadow-sm" : "text-zinc-500")}
              >
                {k === "credit" ? <Plus className="size-4" /> : <Minus className="size-4" />}
                {k === "credit" ? "Crédito" : "Débito"}
              </button>
            ))}
          </div>
          <Field label="Valor">
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="Descrição (aparece no extrato)">
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: PIX recebido por fora" />
          </Field>
        </div>
      </Modal>
    </>
  );
}

export function ResellerNotes({ id, notes }: { id: string; notes: string | null }) {
  const [v, setV] = useState(notes ?? "");
  const { exec, pending } = useAction();
  return (
    <div className="grid gap-2">
      <Textarea value={v} onChange={(e) => setV(e.target.value)} placeholder="Anotações internas sobre este revendedor" className="min-h-24" />
      <Button variant="secondary" size="sm" loading={pending} onClick={() => exec(() => saveResellerNotes(id, v))} className="justify-self-end">
        Salvar anotações
      </Button>
    </div>
  );
}

export function CreateResellerButton() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", storeName: "", email: "", phone: "", password: "" });
  const { exec, pending } = useAction();
  const router = useRouter();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus /> Cadastrar manualmente
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo revendedor"
        description="O revendedor já entra ativo. Envie o e-mail e a senha para ele."
        footer={
          <Button className="w-full" loading={pending} onClick={() => exec(() => createResellerManually(f), { onSuccess: (d) => d && router.push(`/f/revendedores/${d.id}`) })}>
            Cadastrar
          </Button>
        }
      >
        <div className="grid gap-4">
          <Field label="Nome">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Nome da loja (opcional)">
            <Input value={f.storeName} onChange={(e) => setF({ ...f, storeName: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mail">
              <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </Field>
            <Field label="WhatsApp">
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" />
            </Field>
          </div>
          <Field label="Senha inicial">
            <Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
