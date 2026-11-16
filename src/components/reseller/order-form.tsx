"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleAlert, Minus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createOrder, searchProductsForOrder, type OrderProductOption } from "@/actions/reseller";
import { Button } from "@/components/ui/button";
import { Field, Textarea, fieldBase } from "@/components/ui/input";
import { LabelPicker } from "@/components/ui/label-picker";
import { ProductThumb } from "@/components/ui/misc";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

type Line = { variantId: string; productName: string; variantName: string | null; sku: string; image: string | null; price: number; stock: number; quantity: number };

function lineFrom(p: OrderProductOption, v: OrderProductOption["variants"][number]): Line {
  return { variantId: v.id, productName: p.name, variantName: p.hasVariants ? v.name : null, sku: v.sku, image: v.image, price: v.price, stock: v.stock, quantity: 1 };
}

export function OrderForm({
  preset,
  requireLabel,
  handlingFee,
  balance,
  myMarketplaces,
  onDone,
}: {
  preset?: OrderProductOption | null;
  requireLabel: boolean;
  handlingFee: number;
  balance: number;
  myMarketplaces: string[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>(() => {
    if (preset && !preset.hasVariants && preset.variants[0]) return [lineFrom(preset, preset.variants[0])];
    return [];
  });
  const [picking, setPicking] = useState<OrderProductOption | null>(preset?.hasVariants ? preset : null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<OrderProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [notes, setNotes] = useState("");
  const [labels, setLabels] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchProductsForOrder(q);
      setSearching(false);
      if (res.ok) setResults(res.data ?? []);
    }, 300);
  }, [q]);

  function add(p: OrderProductOption, v: OrderProductOption["variants"][number]) {
    if (v.stock <= 0) return toast.error("Variação sem estoque");
    setLines((ls) => {
      const ex = ls.find((l) => l.variantId === v.id);
      if (ex) return ls.map((l) => (l.variantId === v.id ? { ...l, quantity: Math.min(l.quantity + 1, l.stock) } : l));
      return [...ls, lineFrom(p, v)];
    });
    toast.success(`${p.hasVariants ? v.name : p.name} adicionado`);
  }

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const total = subtotal + (lines.length ? handlingFee : 0);
  const enough = balance >= total;

  async function submit() {
    if (!lines.length) return toast.error("Adicione ao menos um produto");
    if (requireLabel && !labels.length) return toast.error("Anexe a etiqueta de envio");
    setSending(true);
    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        marketplace: myMarketplaces[0] ?? "OUTRO",
        notes,
      }),
    );
    labels.forEach((f) => fd.append("label", f));
    const res = await createOrder(fd);
    setSending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.data?.paid ? "Pedido criado e pago com seu saldo" : "Pedido criado. Adicione saldo para confirmar.");
    onDone?.();
    router.push(`/r/pedidos/${res.data!.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Itens */}
      <section>
        <p className="mb-2 text-[13px] font-semibold text-zinc-700">Produtos</p>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto por nome ou SKU" className={cn(fieldBase, "h-11 pl-10")} />
          {(results.length > 0 || searching) && q && (
            <div className="absolute inset-x-0 top-12 z-20 max-h-72 overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-zinc-200">
              {searching && <p className="p-3 text-sm text-zinc-500">Buscando...</p>}
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setQ("");
                    setResults([]);
                    if (p.hasVariants) setPicking(p);
                    else if (p.variants[0]) add(p, p.variants[0]);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-50"
                >
                  <ProductThumb src={p.image} alt="" size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-zinc-500">
                      {p.sku} · {brl(p.price)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {picking && (
          <div className="mt-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{picking.name}</p>
              <button type="button" onClick={() => setPicking(null)} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
                Fechar
              </button>
            </div>
            <p className="mb-2 text-xs text-zinc-500">Toque na variação vendida:</p>
            <div className="flex flex-wrap gap-2">
              {picking.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.stock <= 0}
                  onClick={() => add(picking, v)}
                  className="rounded-xl bg-white px-3 py-2 text-left text-[13px] ring-1 ring-zinc-200 transition hover:ring-brand disabled:opacity-40"
                >
                  <span className="block font-semibold">{v.name}</span>
                  <span className="block text-[11px] text-zinc-500">
                    {v.stock > 0 ? `${v.stock} disp.` : "Esgotado"} · {brl(v.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {lines.length > 0 && (
          <div className="mt-3 divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200">
            {lines.map((l) => (
              <div key={l.variantId} className="flex items-center gap-3 p-2.5">
                <ProductThumb src={l.image} alt="" size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.productName}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {l.variantName && `${l.variantName} · `}
                    {brl(l.price)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.map((x) => (x.variantId === l.variantId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}
                    className="flex size-8 items-center justify-center rounded-lg bg-zinc-100"
                    aria-label="Menos"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.map((x) => (x.variantId === l.variantId ? { ...x, quantity: Math.min(x.stock, x.quantity + 1) } : x)))}
                    className="flex size-8 items-center justify-center rounded-lg bg-zinc-100"
                    aria-label="Mais"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.variantId !== l.variantId))} className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600" aria-label="Remover">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Venda */}
      <section className="grid gap-4">
        <Field label={`Etiqueta de envio${requireLabel ? "" : " (opcional)"}`} hint="Baixe a etiqueta no painel do marketplace e anexe aqui">
          <LabelPicker files={labels} onChange={setLabels} />
        </Field>
        <Field label="Observação para o fornecedor">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16" placeholder="Opcional" />
        </Field>
      </section>

      {/* Resumo */}
      <section className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Produtos</span>
            <span className="tabular-nums">{brl(subtotal)}</span>
          </div>
          {handlingFee > 0 && lines.length > 0 && (
            <div className="flex justify-between text-zinc-500">
              <span>Taxa do pedido</span>
              <span className="tabular-nums">{brl(handlingFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{brl(total)}</span>
          </div>
        </div>
        {lines.length > 0 && (
          <div className={cn("mt-3 flex items-start gap-2 rounded-xl p-3 text-[13px]", enough ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>
            {enough ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
            <span>
              {enough
                ? `Seu saldo (${brl(balance)}) cobre o pedido. Ele será pago e confirmado na hora.`
                : `Saldo atual ${brl(balance)}. Faltam ${brl(total - balance)}. O pedido fica aguardando pagamento até você adicionar saldo.`}
            </span>
          </div>
        )}
        <Button size="lg" className="mt-4 w-full" loading={sending} onClick={submit} disabled={!lines.length}>
          Enviar pedido
        </Button>
      </section>
    </div>
  );
}
