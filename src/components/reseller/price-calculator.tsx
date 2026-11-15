"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Settings2 } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { MoneyInput, PercentInput } from "@/components/ui/money-input";
import { analyzePrice, charmPrice, suggestPrice, type CostInput, type FeeProfileInput } from "@/lib/pricing";
import { brl, money, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CalcCosts = Omit<CostInput, "productCost" | "handlingFee"> & { targetMarginPct: number };

export function PriceCalculator({
  productCost,
  handlingFee,
  profiles,
  costs,
  suggestedPrice,
  compact,
}: {
  productCost: number;
  handlingFee: number;
  profiles: FeeProfileInput[];
  costs: CalcCosts;
  suggestedPrice?: number | null;
  compact?: boolean;
}) {
  const [margin, setMargin] = useState(costs.targetMarginPct);
  const [open, setOpen] = useState<number | null>(compact ? null : 0);
  const [custom, setCustom] = useState<Record<number, number>>({});
  const cost: CostInput = { productCost, handlingFee, packagingCost: costs.packagingCost, otherCost: costs.otherCost, taxPct: costs.taxPct, adsPct: costs.adsPct };

  const rows = useMemo(
    () =>
      profiles.map((f) => {
        const raw = suggestPrice(f, cost, margin);
        const price = raw ? charmPrice(raw) : null;
        return { f, price, b: price ? analyzePrice(f, cost, price) : null };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profiles, productCost, handlingFee, margin, costs],
  );

  if (!profiles.length)
    return (
      <p className="text-sm text-zinc-500">
        Cadastre as taxas das suas plataformas em{" "}
        <Link href="/r/configuracoes?tab=taxas" className="font-medium text-brand underline">
          Configurações
        </Link>
        .
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
        <div className="min-w-0 flex-1 text-[13px] text-zinc-600">
          Custo do produto <span className="font-semibold text-zinc-900">{brl(productCost)}</span>
          {handlingFee > 0 && (
            <>
              {" "}
              + taxa do pedido <span className="font-semibold text-zinc-900">{brl(handlingFee)}</span>
            </>
          )}
          {suggestedPrice ? (
            <span className="block text-xs text-zinc-500">Preço sugerido pelo fornecedor: {brl(suggestedPrice)}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-zinc-600">Margem</span>
          <PercentInput value={margin} onChange={setMargin} className="w-24" />
        </div>
      </div>
      <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl ring-1 ring-zinc-200">
        {rows.map(({ f, price, b }, i) => {
          const sim = custom[i] ? analyzePrice(f, cost, custom[i]) : null;
          return (
            <div key={i} className="bg-white">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{f.name}</span>
                  <span className="block text-xs text-zinc-500">
                    {pct(f.commissionPct + f.extraPct)}
                    {f.fixedFee ? ` + ${brl(f.fixedFee)}${f.fixedFeeThreshold ? ` abaixo de ${brl(f.fixedFeeThreshold)}` : ""}` : ""}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-[11px] text-zinc-500">Vender por</span>
                  <span className="block text-base font-semibold tabular-nums">{price ? brl(price) : "Inviável"}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[11px] text-zinc-500">Lucro</span>
                  <span className={cn("block text-sm font-semibold tabular-nums", b && b.profit > 0 ? "text-emerald-600" : "text-red-600")}>{b ? brl(b.profit) : "-"}</span>
                </span>
                <ChevronDown className={cn("size-4 text-zinc-400 transition", open === i && "rotate-180")} />
              </button>
              {open === i && b && (
                <div className="animate-in border-t border-zinc-100 bg-zinc-50/60 px-3.5 py-3 text-[13px]">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <span className="text-zinc-500">Comissão</span>
                    <span className="text-right tabular-nums">- {brl(b.commission + b.extra)}</span>
                    {b.fixed > 0 && (
                      <>
                        <span className="text-zinc-500">Tarifa fixa</span>
                        <span className="text-right tabular-nums">- {brl(b.fixed)}</span>
                      </>
                    )}
                    {b.shipping > 0 && (
                      <>
                        <span className="text-zinc-500">Frete</span>
                        <span className="text-right tabular-nums">- {brl(b.shipping)}</span>
                      </>
                    )}
                    <span className="text-zinc-500">Impostos ({pct(cost.taxPct)})</span>
                    <span className="text-right tabular-nums">- {brl(b.tax)}</span>
                    {b.ads > 0 && (
                      <>
                        <span className="text-zinc-500">Anúncios ({pct(cost.adsPct)})</span>
                        <span className="text-right tabular-nums">- {brl(b.ads)}</span>
                      </>
                    )}
                    <span className="text-zinc-500">Produto e custos</span>
                    <span className="text-right tabular-nums">- {brl(b.costs)}</span>
                    <span className="font-semibold">Lucro líquido</span>
                    <span className="text-right font-semibold text-emerald-600 tabular-nums">
                      {brl(b.profit)} ({pct(b.marginPct)})
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CopyButton text={money(b.price)} label="Copiar preço" />
                    <span className="ml-auto text-xs text-zinc-500">Simular outro preço</span>
                    <MoneyInput value={custom[i] ?? 0} onChange={(c) => setCustom({ ...custom, [i]: c })} className="w-32" />
                  </div>
                  {sim && (
                    <p className={cn("mt-2 text-right text-sm font-semibold", sim.profit > 0 ? "text-emerald-600" : "text-red-600")}>
                      Vendendo por {brl(sim.price)}: lucro {brl(sim.profit)} ({pct(sim.marginPct)})
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Link href="/r/configuracoes?tab=taxas" className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-zinc-500 hover:text-zinc-900">
        <Settings2 className="size-4" /> Ajustar minhas taxas e custos
      </Link>
    </div>
  );
}
