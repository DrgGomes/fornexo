"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { updateStock } from "@/actions/products";
import { ProductThumb } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

type Row = { id: string; productId: string; product: string; variant: string; hasVariants: boolean; sku: string; stock: number; low: number; image: string | null };

function StockCell({ row }: { row: Row }) {
  const [value, setValue] = useState(String(row.stock));
  const [saved, setSaved] = useState(row.stock);
  const [busy, setBusy] = useState(false);

  async function commit(n: number) {
    if (!Number.isFinite(n) || n === saved) {
      setValue(String(saved));
      return;
    }
    setBusy(true);
    const res = await updateStock(row.id, n);
    setBusy(false);
    if (res.ok) {
      setSaved(n);
      setValue(String(n));
      toast.success(`Estoque atualizado: ${n}`);
    } else {
      toast.error(res.error);
      setValue(String(saved));
    }
  }

  const n = parseInt(value, 10);
  return (
    <div className={cn("flex items-center gap-1", busy && "opacity-60")}>
      <button type="button" onClick={() => commit(saved - 1)} className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 active:scale-95" aria-label="Diminuir">
        <Minus className="size-4" />
      </button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d-]/g, ""))}
        onBlur={() => commit(n)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={cn(
          "h-9 w-16 rounded-lg text-center text-sm font-semibold tabular-nums ring-1 ring-zinc-200 outline-none focus:ring-2 focus:ring-brand",
          saved <= 0 ? "text-red-600" : saved <= row.low ? "text-amber-600" : "text-zinc-900",
        )}
      />
      <button type="button" onClick={() => commit(saved + 1)} className="flex size-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 active:scale-95" aria-label="Aumentar">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function StockEditor({ rows }: { rows: Row[] }) {
  return (
    <div className="divide-y divide-zinc-100">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
          <ProductThumb src={r.image} alt={r.product} size={44} />
          <Link href={`/f/produtos/${r.productId}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{r.product}</p>
            <p className="truncate text-xs text-zinc-500">
              {r.hasVariants ? `${r.variant} · ` : ""}
              <span className="font-mono">{r.sku}</span>
            </p>
          </Link>
          <StockCell row={r} />
        </div>
      ))}
    </div>
  );
}
