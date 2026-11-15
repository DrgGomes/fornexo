"use client";

import { useState } from "react";
import { Field, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { brl } from "@/lib/format";
import type { FeeProfileInput } from "@/lib/pricing";
import { PriceCalculator, type CalcCosts } from "./price-calculator";

export function StandaloneCalculator({
  products,
  profiles,
  costs,
  handlingFee,
}: {
  products: { id: string; name: string; price: number; suggestedPrice: number | null }[];
  profiles: FeeProfileInput[];
  costs: CalcCosts;
  handlingFee: number;
}) {
  const [pid, setPid] = useState("");
  const [cost, setCost] = useState(products[0]?.price ?? 0);
  const selected = products.find((p) => p.id === pid);
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Produto do catálogo">
          <Select
            value={pid}
            onChange={(e) => {
              setPid(e.target.value);
              const p = products.find((x) => x.id === e.target.value);
              if (p) setCost(p.price);
            }}
          >
            <option value="">Digitar custo manualmente</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {brl(p.price)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Custo do produto">
          <MoneyInput value={cost} onChange={(c) => (setCost(c), setPid(""))} />
        </Field>
      </div>
      <PriceCalculator productCost={cost} handlingFee={handlingFee} profiles={profiles} costs={costs} suggestedPrice={selected?.suggestedPrice} />
    </div>
  );
}
