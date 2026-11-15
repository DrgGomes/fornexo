"use client";

import { useState } from "react";
import { updateSupplierSettings, addTeamMember, setTeamMemberActive, changePassword, type SettingsSection } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/components/ui/use-action";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { pixPayload } from "@/lib/pix";

function SaveBar({ onSave, pending }: { onSave: () => void; pending: boolean }) {
  return (
    <div className="flex justify-end border-t border-zinc-100 px-5 py-3">
      <Button onClick={onSave} loading={pending}>
        Salvar alterações
      </Button>
    </div>
  );
}

function useSection<T extends object>(section: SettingsSection, initial: T) {
  const [v, setV] = useState(initial);
  const { exec, pending } = useAction();
  const set = <K extends keyof T>(k: K, val: T[K]) => setV((s) => ({ ...s, [k]: val }));
  const save = () => exec(() => updateSupplierSettings(section, v));
  return { v, set, save, pending };
}

export function StoreForm({ initial }: { initial: { name: string; document: string; email: string; phone: string; whatsapp: string; city: string; state: string } }) {
  const { v, set, save, pending } = useSection("store", initial);
  return (
    <Card>
      <CardHeader title="Dados da empresa" />
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da empresa" className="sm:col-span-2">
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="CNPJ / CPF">
          <Input value={v.document} onChange={(e) => set("document", e.target.value)} />
        </Field>
        <Field label="E-mail de contato">
          <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Telefone">
          <Input value={v.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
        </Field>
        <Field label="WhatsApp (botão na vitrine)">
          <Input value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} inputMode="tel" />
        </Field>
        <Field label="Cidade">
          <Input value={v.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="UF">
          <Input value={v.state} maxLength={2} onChange={(e) => set("state", e.target.value.toUpperCase())} />
        </Field>
      </CardBody>
      <SaveBar onSave={save} pending={pending} />
    </Card>
  );
}

export function ShowcaseForm({
  initial,
  origin,
}: {
  initial: { slug: string; logoUrl: string; bannerUrl: string; primaryColor: string; description: string; showcasePublic: boolean; showcaseShowPrices: boolean };
  origin: string;
}) {
  const { v, set, save, pending } = useSection("showcase", initial);
  const colors = ["#4f46e5", "#0f172a", "#2563eb", "#0891b2", "#059669", "#16a34a", "#ea580c", "#dc2626", "#db2777", "#9333ea"];
  return (
    <Card>
      <CardHeader title="Vitrine e marca" description="Aparece na vitrine pública e no portal do revendedor" />
      <CardBody className="grid gap-4">
        <Field label="Endereço da vitrine" hint={`${origin}/v/${v.slug}`}>
          <Input value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="font-mono" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo (link da imagem)">
            <Input value={v.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Banner (link da imagem)">
            <Input value={v.bannerUrl} onChange={(e) => set("bannerUrl", e.target.value)} placeholder="https://" />
          </Field>
        </div>
        <Field label="Cor da marca">
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("primaryColor", c)}
                className="size-9 rounded-full ring-2 ring-offset-2 transition"
                style={{ background: c, ["--tw-ring-color" as string]: v.primaryColor === c ? c : "transparent" }}
                aria-label={c}
              />
            ))}
            <input type="color" value={v.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="size-9 cursor-pointer rounded-full border-0 bg-transparent" />
          </div>
        </Field>
        <Field label="Descrição da empresa" hint="Conte por que vale a pena revender seus produtos">
          <Textarea value={v.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Switch checked={v.showcasePublic} onChange={(x) => set("showcasePublic", x)} label="Vitrine pública" description="Qualquer pessoa com o link vê seus produtos" />
        <Switch checked={v.showcaseShowPrices} onChange={(x) => set("showcaseShowPrices", x)} label="Mostrar preço de revenda na vitrine" description="Se desligado, o preço aparece só para revendedores cadastrados" />
      </CardBody>
      <SaveBar onSave={save} pending={pending} />
    </Card>
  );
}

export function RulesForm({ initial }: { initial: { handlingFee: number; autoApproveResellers: boolean; requireLabel: boolean; shippingDeadline: string } }) {
  const { v, set, save, pending } = useSection("rules", initial);
  return (
    <Card>
      <CardHeader title="Regras de operação" />
      <CardBody className="grid gap-5">
        <Field label="Taxa por pedido (manuseio e embalagem)" hint="Somada ao valor de cada pedido. Deixe zero se não cobrar.">
          <MoneyInput value={v.handlingFee} onChange={(c) => set("handlingFee", c)} className="sm:max-w-56" />
        </Field>
        <Field label="Prazo de postagem" hint="Exibido para os revendedores">
          <Input value={v.shippingDeadline} onChange={(e) => set("shippingDeadline", e.target.value)} placeholder="Ex: Postagem em até 24h úteis" />
        </Field>
        <Switch checked={v.autoApproveResellers} onChange={(x) => set("autoApproveResellers", x)} label="Aprovar revendedores automaticamente" description="Se desligado, você aprova cada cadastro manualmente" />
        <Switch checked={v.requireLabel} onChange={(x) => set("requireLabel", x)} label="Exigir etiqueta no pedido" description="O revendedor só consegue fazer o pedido anexando a etiqueta do marketplace" />
      </CardBody>
      <SaveBar onSave={save} pending={pending} />
    </Card>
  );
}

export function PaymentForm({ initial }: { initial: { pixKey: string; pixHolder: string; pixCity: string } }) {
  const { v, set, save, pending } = useSection("payment", initial);
  let preview = "";
  try {
    if (v.pixKey && v.pixHolder && v.pixCity) preview = pixPayload({ key: v.pixKey, name: v.pixHolder, city: v.pixCity, amountCents: 1000 });
  } catch {}
  return (
    <Card>
      <CardHeader title="Recebimento via PIX" description="Os revendedores adicionam saldo pagando para esta chave. O QR Code é gerado automaticamente com o valor." />
      <CardBody className="grid gap-4">
        <Field label="Chave PIX" hint="CPF, CNPJ, e-mail, celular (+55...) ou chave aleatória">
          <Input value={v.pixKey} onChange={(e) => set("pixKey", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do titular">
            <Input value={v.pixHolder} onChange={(e) => set("pixHolder", e.target.value)} />
          </Field>
          <Field label="Cidade do titular">
            <Input value={v.pixCity} onChange={(e) => set("pixCity", e.target.value)} />
          </Field>
        </div>
        {preview && (
          <div className="rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
            <p className="text-xs font-medium text-zinc-500">Exemplo de código copia e cola (R$ 10,00)</p>
            <p className="mt-1 font-mono text-[11px] break-all text-zinc-600">{preview}</p>
          </div>
        )}
      </CardBody>
      <SaveBar onSave={save} pending={pending} />
    </Card>
  );
}

export function TeamForm({ members, meId }: { members: { id: string; name: string; email: string; active: boolean; lastLoginAt: string | null }[]; meId: string }) {
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const { exec, pending } = useAction();
  return (
    <Card>
      <CardHeader title="Equipe" description="Pessoas com acesso ao painel (separação, expedição, atendimento)" />
      <div className="divide-y divide-zinc-100 border-y border-zinc-100">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={m.name} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.name} {m.id === meId && <span className="text-zinc-400">(você)</span>}
              </p>
              <p className="truncate text-xs text-zinc-500">{m.email}</p>
            </div>
            {!m.active && <Badge tone="red">Desativado</Badge>}
            {m.id !== meId && (
              <Button size="sm" variant="secondary" onClick={() => exec(() => setTeamMemberActive(m.id, !m.active))}>
                {m.active ? "Desativar" : "Reativar"}
              </Button>
            )}
          </div>
        ))}
      </div>
      <CardBody className="grid gap-3 pt-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Input placeholder="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input placeholder="E-mail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Input placeholder="Senha inicial" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <Button variant="dark" loading={pending} onClick={() => exec(() => addTeamMember(f), { onSuccess: () => setF({ name: "", email: "", password: "" }) })}>
          Adicionar
        </Button>
      </CardBody>
    </Card>
  );
}

export function PasswordForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const { exec, pending } = useAction();
  return (
    <Card>
      <CardHeader title="Alterar senha" />
      <CardBody className="grid gap-4 sm:max-w-md">
        <Field label="Senha atual">
          <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="Nova senha">
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Field>
        <Button
          variant="dark"
          loading={pending}
          onClick={() =>
            exec(() => changePassword(cur, next), {
              onSuccess: () => {
                setCur("");
                setNext("");
              },
            })
          }
          className="justify-self-start"
        >
          Alterar senha
        </Button>
      </CardBody>
    </Card>
  );
}
