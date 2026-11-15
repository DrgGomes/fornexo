import { Check } from "lucide-react";
import type { OrderStatus } from "@/db/schema";
import { ProductThumb } from "@/components/ui/misc";
import { ORDER_FLOW, ORDER_STATUS } from "@/lib/constants";
import { brl, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "CANCELED" || status === "AWAITING_PAYMENT") {
    return (
      <div className={cn("rounded-2xl p-4 text-sm ring-1", status === "CANCELED" ? "bg-red-50 text-red-800 ring-red-100" : "bg-amber-50 text-amber-900 ring-amber-100")}>
        <p className="font-semibold">{ORDER_STATUS[status].label}</p>
        <p className="mt-0.5 opacity-80">{ORDER_STATUS[status].hint}</p>
      </div>
    );
  }
  const idx = ORDER_FLOW.indexOf(status);
  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
      <ol className="flex min-w-[520px] items-start">
        {ORDER_FLOW.map((s, i) => {
          const done = i <= idx;
          return (
            <li key={s} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && <span className={cn("absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2", i <= idx ? "bg-brand" : "bg-zinc-200")} />}
              <span
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-white",
                  done ? "bg-brand text-brand-fg" : "bg-zinc-100 text-zinc-400",
                  i === idx && "ring-brand/20",
                )}
              >
                {i < idx ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("mt-2 text-[11px] font-medium", done ? "text-zinc-900" : "text-zinc-400")}>{ORDER_STATUS[s].short}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export type ItemView = { id: string; productName: string; variantName: string | null; sku: string; imageUrl: string | null; unitPrice: number; quantity: number; total: number };

export function OrderItemsList({ items, subtotal, handlingFee, total }: { items: ItemView[]; subtotal: number; handlingFee: number; total: number }) {
  return (
    <div>
      <div className="divide-y divide-zinc-100">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 py-3">
            <ProductThumb src={it.imageUrl} alt={it.productName} size={52} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium leading-snug">{it.productName}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {it.variantName && `${it.variantName} · `}
                <span className="font-mono">{it.sku}</span>
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold tabular-nums">{brl(it.total)}</p>
              <p className="text-xs text-zinc-500 tabular-nums">
                {it.quantity} x {brl(it.unitPrice)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1.5 border-t border-zinc-100 pt-3 text-sm">
        <div className="flex justify-between text-zinc-500">
          <span>Produtos</span>
          <span className="tabular-nums">{brl(subtotal)}</span>
        </div>
        {handlingFee > 0 && (
          <div className="flex justify-between text-zinc-500">
            <span>Taxa de manuseio</span>
            <span className="tabular-nums">{brl(handlingFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{brl(total)}</span>
        </div>
      </div>
    </div>
  );
}

export function OrderTimeline({ events }: { events: { id: string; message: string; actorName: string | null; createdAt: Date; status: OrderStatus | null }[] }) {
  return (
    <ol className="relative ml-1.5 border-l border-zinc-200">
      {events.map((e, i) => (
        <li key={e.id} className="mb-4 ml-4 last:mb-0">
          <span className={cn("absolute -left-[5px] mt-1.5 size-2.5 rounded-full ring-4 ring-white", i === 0 ? "bg-brand" : "bg-zinc-300")} />
          <p className="text-sm font-medium text-zinc-900">{e.message}</p>
          <p className="text-xs text-zinc-500">
            {formatDateTime(e.createdAt)}
            {e.actorName && ` · ${e.actorName}`}
          </p>
        </li>
      ))}
    </ol>
  );
}
