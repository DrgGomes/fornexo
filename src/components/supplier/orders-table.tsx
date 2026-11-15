"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList, Printer, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { supplierBulkStatus } from "@/actions/supplier-orders";
import type { OrderStatus } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { OrderStatusBadge, ProductThumb } from "@/components/ui/misc";
import { useAction } from "@/components/ui/use-action";
import { marketplaceLabel, ORDER_STATUS, SCAN_STATUSES } from "@/lib/constants";
import { brl, formatDateTime, orderCode } from "@/lib/format";
import { cn } from "@/lib/utils";

export type OrderRowData = {
  id: string;
  number: number;
  status: OrderStatus;
  paid: boolean;
  total: number;
  marketplace: string;
  externalOrderId: string | null;
  customerName: string | null;
  createdAt: Date;
  hasLabel: boolean;
  reseller: string;
  items: number;
  image: string | null;
};

export function OrdersTable({ rows }: { rows: OrderRowData[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { exec, pending } = useAction();
  const all = rows.length > 0 && sel.size === rows.length;
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const ids = [...sel].join(",");

  return (
    <>
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-2.5 sm:px-5">
        <input
          type="checkbox"
          className="size-4 accent-zinc-900"
          checked={all}
          onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))}
          aria-label="Selecionar todos"
        />
        <span className="text-xs font-medium text-zinc-500">{sel.size ? `${sel.size} selecionados` : "Selecionar todos desta página"}</span>
      </div>
      <div className="divide-y divide-zinc-100">
        {rows.map((o) => (
          <div key={o.id} className={cn("flex items-center gap-3 px-4 py-3 transition sm:px-5", sel.has(o.id) ? "bg-brand/5" : "hover:bg-zinc-50/70")}>
            <input type="checkbox" className="size-4 shrink-0 accent-zinc-900" checked={sel.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Selecionar ${o.number}`} />
            <Link href={`/f/pedidos/${o.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <ProductThumb src={o.image} alt="" size={44} className="hidden sm:block" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-sm font-semibold">#{orderCode(o.number)}</span>
                  <OrderStatusBadge status={o.status} />
                  {!o.hasLabel && <Badge tone="orange">Sem etiqueta</Badge>}
                </div>
                <p className="mt-1 truncate text-[13px] text-zinc-600">
                  {o.reseller}
                  {o.customerName && <span className="text-zinc-400"> · cliente {o.customerName}</span>}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-400">
                  {marketplaceLabel(o.marketplace)}
                  {o.externalOrderId && ` ${o.externalOrderId}`} · {o.items} {o.items === 1 ? "item" : "itens"} · {formatDateTime(o.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{brl(o.total)}</p>
                <p className={cn("text-xs", o.paid ? "text-emerald-600" : "text-amber-600")}>{o.paid ? "Pago" : "Não pago"}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {sel.size > 0 && (
        <div className="pb-safe fixed inset-x-0 bottom-16 z-40 px-3 pb-3 lg:bottom-4 lg:left-[264px]">
          <div className="animate-in mx-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-2xl bg-zinc-900 p-2.5 text-white shadow-2xl">
            <button onClick={() => setSel(new Set())} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Limpar seleção">
              <X className="size-4" />
            </button>
            <span className="mr-auto text-sm font-medium">{sel.size} selecionados</span>
            <a href={`/print/pedidos?ids=${ids}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13px] font-medium hover:bg-white/20">
              <Printer className="size-4" /> Cupons
            </a>
            <a href={`/print/separacao?ids=${ids}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13px] font-medium hover:bg-white/20">
              <ClipboardList className="size-4" /> Separação
            </a>
            <a href={`/api/labels?ids=${ids}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[13px] font-medium hover:bg-white/20">
              <Tag className="size-4" /> Etiquetas
            </a>
            <div className="flex items-center gap-1.5">
              <Select
                defaultValue=""
                disabled={pending}
                onChange={(e) => {
                  const st = e.target.value as OrderStatus;
                  e.target.value = "";
                  if (!st) return;
                  exec(() => supplierBulkStatus([...sel], st), {
                    silent: true,
                    onSuccess: (d) => {
                      if (d) toast.success(`${d.ok} atualizados${d.skipped ? `, ${d.skipped} ignorados (não pagos ou cancelados)` : ""}`);
                      setSel(new Set());
                    },
                  });
                }}
                className="h-9 w-40 border-0 bg-white text-[13px] text-zinc-900 sm:h-9"
              >
                <option value="">Mudar status</option>
                {[...SCAN_STATUSES, "DELIVERED" as OrderStatus].map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS[s].label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
