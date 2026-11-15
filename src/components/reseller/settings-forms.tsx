"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveCosts, saveFeeProfiles, updateResellerProfile } from "@/actions/reseller";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { MoneyInput, PercentInput } from "@/components/ui/money-input";
import { useAction } from "@/components/ui/use-action";
import { MARKETPLACES } from "@/lib/constants";
import type { FeeProfileInput } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function FeeProfilesForm({ initial }: { initial: FeeProfileInput[] }) {
  const [rows, setRows] = useState(initial);
  const { exec, pending } = useAction();
  const up = (i: number, patch: Partial<FeeProfileInput>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Card>
      <CardHeader title="Taxas das plataformas" description="Os valores iniciais são exemplos. Confira as taxas atuais da sua conta em cada marketplace e ajuste aqui." />
      <CardBody className="flex flex-col gap-3">
        {rows.map((f, i) => (
          <div key={i} className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
            <div className="mb-3 flex items-center gap-2">
              <Input value={f.name} onChange={(e) => up(i, { name: e.target.value })} className="font-semibold" />
              <Button variant="ghost" size="icon" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} aria-label="Remover">
                <Trash2 />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Field label="Comissão">
                <PercentInput value={f.commissionPct} onChange={(v) => up(i, { commissionPct: v })} />
              </Field>
              <Field label="Taxa extra" hint="Frete grátis, campanhas">
                <PercentInput value={f.extraPct} onChange={(v) => up(i, { extraPct: v })} />
              </Field>
              <Field label="Tarifa fixa">
                <MoneyInput value={f.fixedFee} onChange={(v) => up(i, { fixedFee: v })} />
              </Field>
              <Field label="Fixa só abaixo de" hint="Vazio = sempre">
                <MoneyInput value={f.fixedFeeThreshold ?? 0} onChange={(v) => up(i, { fixedFeeThreshold: v || null })} />
              </Field>
              <Field label="Frete pago por você">
                <MoneyInput value={f.shippingCost} onChange={(v) => up(i, { shippingCost: v })} />
              </Field>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            variant="secondary"
            onClick={() => setRows((r) => [...r, { name: "Nova plataforma", commissionPct: 10, extraPct: 0, fixedFee: 0, fixedFeeThreshold: null, shippingCost: 0 }])}
          >
            <Plus /> Adicionar plataforma
          </Button>
          <Button loading={pending} onClick={() => exec(() => saveFeeProfiles(rows))}>
            Salvar taxas
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export function CostsForm({ initial }: { initial: { taxPct: number; adsPct: number; packagingCost: number; otherCost: number; targetMarginPct: number } }) {
  const [v, setV] = useState(initial);
  const { exec, pending } = useAction();
  return (
    <Card>
      <CardHeader title="Meus custos e meta" description="Usados em todos os cálculos de preço" />
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Impostos sobre a venda" hint="Ex: Simples Nacional ou MEI">
          <PercentInput value={v.taxPct} onChange={(x) => setV({ ...v, taxPct: x })} />
        </Field>
        <Field label="Investimento em anúncios" hint="Percentual médio do faturamento">
          <PercentInput value={v.adsPct} onChange={(x) => setV({ ...v, adsPct: x })} />
        </Field>
        <Field label="Embalagem / brinde por pedido">
          <MoneyInput value={v.packagingCost} onChange={(x) => setV({ ...v, packagingCost: x })} />
        </Field>
        <Field label="Outros custos por pedido">
          <MoneyInput value={v.otherCost} onChange={(x) => setV({ ...v, otherCost: x })} />
        </Field>
        <Field label="Margem de lucro desejada" hint="Lucro líquido sobre o preço de venda">
          <PercentInput value={v.targetMarginPct} onChange={(x) => setV({ ...v, targetMarginPct: x })} />
        </Field>
        <div className="flex items-end justify-end">
          <Button loading={pending} onClick={() => exec(() => saveCosts(v))}>
            Salvar custos
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export function ResellerProfileForm({ initial }: { initial: { name: string; storeName: string; phone: string; document: string; marketplaces: string[] } }) {
  const [v, setV] = useState(initial);
  const { exec, pending } = useAction();
  return (
    <Card>
      <CardHeader title="Meu perfil" />
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome">
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Nome da loja">
          <Input value={v.storeName} onChange={(e) => setV({ ...v, storeName: e.target.value })} />
        </Field>
        <Field label="WhatsApp">
          <Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} inputMode="tel" />
        </Field>
        <Field label="CPF / CNPJ">
          <Input value={v.document} onChange={(e) => setV({ ...v, document: e.target.value })} />
        </Field>
        <Field label="Onde você vende" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {MARKETPLACES.map((m) => {
              const on = v.marketplaces.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setV({ ...v, marketplaces: on ? v.marketplaces.filter((x) => x !== m.id) : [...v.marketplaces, m.id] })}
                  className={cn("h-9 rounded-full px-3.5 text-[13px] font-medium ring-1", on ? "bg-brand text-brand-fg ring-brand" : "bg-white text-zinc-600 ring-zinc-200")}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <Button loading={pending} onClick={() => exec(() => updateResellerProfile(v))}>
            Salvar perfil
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
