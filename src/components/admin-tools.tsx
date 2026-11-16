"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { adminCreateSupplier, adminSeedDemo, adminUpdateSupplier } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/components/ui/use-action";

export function AdminCreateSupplier() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ company: "", name: "", email: "", password: "" });
  const { exec, pending } = useAction();
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Novo fornecedor
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo fornecedor"
        footer={
          <Button className="w-full" loading={pending} onClick={() => exec(() => adminCreateSupplier(f), { onSuccess: (d) => d && router.push(`/admin/fornecedores/${d.id}`) })}>
            Criar
          </Button>
        }
      >
        <div className="grid gap-4">
          <Field label="Empresa">
            <Input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          </Field>
          <Field label="Responsável">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="E-mail de acesso">
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <Field label="Senha inicial">
            <Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

export function AdminSeedButton() {
  const { exec, pending } = useAction();
  return (
    <Button variant="secondary" loading={pending} onClick={() => exec(() => adminSeedDemo())}>
      <Sparkles /> Criar demonstração
    </Button>
  );
}

export function AdminSupplierForm({
  id,
  initial,
}: {
  id: string;
  initial: { status: "TRIAL" | "ACTIVE" | "BLOCKED"; plan: string; trialEndsAt: string | null; paidUntil: string | null; adminNotes: string; importerEnabled: boolean };
}) {
  const [v, setV] = useState(initial);
  const { exec, pending } = useAction();
  const addDays = (days: number) => {
    const base = v.paidUntil ? new Date(`${v.paidUntil}T12:00:00`) : new Date();
    const d = new Date(Math.max(base.getTime(), Date.now()) + days * 86400000);
    setV({ ...v, status: "ACTIVE", paidUntil: d.toISOString().slice(0, 10) });
  };
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Situação">
          <Select value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as typeof v.status })}>
            <option value="TRIAL">Teste</option>
            <option value="ACTIVE">Ativo</option>
            <option value="BLOCKED">Bloqueado</option>
          </Select>
        </Field>
        <Field label="Plano">
          <Input value={v.plan} onChange={(e) => setV({ ...v, plan: e.target.value })} />
        </Field>
        <Field label="Fim do teste">
          <Input type="date" value={v.trialEndsAt ?? ""} onChange={(e) => setV({ ...v, trialEndsAt: e.target.value || null })} />
        </Field>
        <Field label="Pago até" hint="Bloqueio automático 5 dias após vencer">
          <Input type="date" value={v.paidUntil ?? ""} onChange={(e) => setV({ ...v, paidUntil: e.target.value || null })} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => addDays(30)}>
          +30 dias
        </Button>
        <Button size="sm" variant="secondary" onClick={() => addDays(90)}>
          +90 dias
        </Button>
        <Button size="sm" variant="secondary" onClick={() => addDays(365)}>
          +1 ano
        </Button>
      </div>
      <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
        <Switch
          checked={v.importerEnabled}
          onChange={(x) => setV({ ...v, importerEnabled: x })}
          label="Importador de anúncios (extensão)"
          description="Libera a extensão que copia anúncios do Mercado Livre, Shopee, TikTok Shop e Temu e o menu Importados"
        />
      </div>
      <Field label="Anotações internas">
        <Textarea value={v.adminNotes} onChange={(e) => setV({ ...v, adminNotes: e.target.value })} />
      </Field>
      <Button loading={pending} onClick={() => exec(() => adminUpdateSupplier(id, v))} className="justify-self-end">
        Salvar
      </Button>
    </div>
  );
}
