"use client";

import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fieldBase } from "./input";

/** Campo de dinheiro estilo app de banco: digita numeros e os centavos se ajustam. */
export function MoneyInput({
  value,
  onChange,
  className,
  placeholder,
  name,
  id,
  disabled,
}: {
  value: number | null | undefined;
  onChange: (cents: number) => void;
  className?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-zinc-400">R$</span>
      <input
        id={id}
        name={name}
        disabled={disabled}
        inputMode="numeric"
        className={cn(fieldBase, "h-11 pl-10 tabular-nums sm:h-10")}
        placeholder={placeholder ?? "0,00"}
        value={value ? money(value) : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
          onChange(digits ? parseInt(digits, 10) : 0);
        }}
      />
    </div>
  );
}

export function PercentInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <input
        inputMode="decimal"
        className={cn(fieldBase, "h-11 pr-8 tabular-nums sm:h-10")}
        value={Number.isFinite(value) ? String(value).replace(".", ",") : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
          const n = parseFloat(raw);
          onChange(Number.isFinite(n) ? Math.min(n, 99) : 0);
        }}
      />
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-zinc-400">%</span>
    </div>
  );
}
