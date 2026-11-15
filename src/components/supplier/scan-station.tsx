"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleAlert, CircleCheck, ExternalLink, Printer, ScanBarcode, Search, Tag } from "lucide-react";
import { scanOrder, type ScanResult } from "@/actions/supplier-orders";
import type { OrderStatus } from "@/db/schema";
import { OrderStatusBadge } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { marketplaceLabel, ORDER_STATUS, SCAN_STATUSES } from "@/lib/constants";
import { formatTime, orderCode } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CameraScanner } from "./camera-scanner";

type Entry = { at: Date; code: string; ok: boolean; message: string; result?: ScanResult };

function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = ok ? 1250 : 220;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.09 : 0.35));
    if (navigator.vibrate) navigator.vibrate(ok ? 40 : [80, 60, 80]);
  } catch {}
}

export function ScanStation() {
  const [mode, setMode] = useState<OrderStatus | "LOOKUP">("PICKING");
  const [ask, setAsk] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [history, setHistory] = useState<Entry[]>([]);
  const [pendingAsk, setPendingAsk] = useState<ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const m = localStorage.getItem("fx_scan_mode");
      if (m) setMode(m as OrderStatus | "LOOKUP");
      setAsk(localStorage.getItem("fx_scan_ask") === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("fx_scan_mode", mode);
      localStorage.setItem("fx_scan_ask", ask ? "1" : "0");
    } catch {}
  }, [mode, ask]);

  const focus = () => {
    setTimeout(() => inputRef.current?.focus(), 30);
  };
  useEffect(() => {
    focus();
  }, []);

  const push = (e: Entry) => setHistory((h) => [e, ...h].slice(0, 40));

  const process = useCallback(
    async (raw: string, forced?: OrderStatus | null) => {
      const c = raw.trim();
      if (!c) return;
      setBusy(true);
      const status = forced !== undefined ? forced : ask || mode === "LOOKUP" ? null : mode;
      const res = await scanOrder(c, status);
      setBusy(false);
      setCode("");
      if (!res.ok) {
        beep(false);
        push({ at: new Date(), code: c, ok: false, message: res.error });
      } else {
        const r = res.data!;
        beep(true);
        const message = status ? (r.changed ? `${ORDER_STATUS[r.previous].short} → ${ORDER_STATUS[r.status].short}` : `Já estava em ${ORDER_STATUS[r.status].short}`) : "Pedido localizado";
        push({ at: new Date(), code: c, ok: true, message, result: r });
        if (ask && forced === undefined) setPendingAsk(r);
      }
      focus();
    },
    [ask, mode],
  );

  const last = history[0];
  const okCount = history.filter((h) => h.ok && h.result?.changed).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200/70 sm:p-5">
          <p className="mb-2.5 text-[13px] font-medium text-zinc-500">Ao bipar, mudar o pedido para:</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {SCAN_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setMode(s);
                  setAsk(false);
                  focus();
                }}
                className={cn(
                  "h-12 rounded-xl px-2 text-[13px] font-semibold ring-1 transition active:scale-[0.98]",
                  mode === s && !ask ? "bg-brand text-brand-fg ring-brand shadow-md shadow-brand/20" : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
                )}
              >
                {ORDER_STATUS[s].label}
              </button>
            ))}
            <button
              onClick={() => {
                setMode("LOOKUP");
                setAsk(false);
                focus();
              }}
              className={cn(
                "h-12 rounded-xl px-2 text-[13px] font-semibold ring-1 transition",
                mode === "LOOKUP" && !ask ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
              )}
            >
              Só consultar
            </button>
          </div>
          <Switch
            className="mt-4"
            checked={ask}
            onChange={(v) => {
              setAsk(v);
              focus();
            }}
            label="Escolher o status a cada bipagem"
            description="Bipe o pedido e toque no novo status"
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            process(code);
          }}
          className="rounded-2xl bg-zinc-900 p-4 sm:p-6"
        >
          <label className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
            <ScanBarcode className="size-5" /> Bipe ou digite o número do pedido
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="go"
                placeholder="000123"
                className="h-16 w-full rounded-xl bg-white px-4 font-mono text-2xl font-semibold tracking-widest text-zinc-900 outline-none placeholder:text-zinc-300 focus:ring-4 focus:ring-brand/40"
              />
              {busy && <span className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />}
            </div>
            <button type="submit" className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20" aria-label="Buscar">
              <Search className="size-6" />
            </button>
            <button type="button" onClick={() => setCamera(true)} className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand text-brand-fg" aria-label="Usar câmera">
              <Camera className="size-6" />
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Leitor USB ou Bluetooth funciona direto: ele digita o código e aperta Enter sozinho.
            {mode !== "LOOKUP" && !ask && (
              <>
                {" "}
                Modo atual: <span className="font-semibold text-zinc-300">{ORDER_STATUS[mode as OrderStatus].label}</span>.
              </>
            )}
          </p>
        </form>

        {pendingAsk && (
          <div className="animate-in rounded-2xl bg-white p-4 ring-2 ring-brand sm:p-5">
            <p className="text-sm text-zinc-500">
              Pedido <span className="font-mono font-semibold text-zinc-900">#{orderCode(pendingAsk.number)}</span> · {pendingAsk.reseller}
            </p>
            <p className="mt-1 mb-3 text-[15px] font-semibold">Escolha o novo status</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {SCAN_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    const n = String(pendingAsk.number);
                    setPendingAsk(null);
                    process(n, s);
                  }}
                  className={cn(
                    "h-12 rounded-xl text-[13px] font-semibold ring-1",
                    s === pendingAsk.status ? "bg-zinc-100 text-zinc-400 ring-zinc-200" : "bg-white text-zinc-800 ring-zinc-200 hover:bg-brand hover:text-brand-fg hover:ring-brand",
                  )}
                >
                  {ORDER_STATUS[s].short}
                </button>
              ))}
            </div>
            <button onClick={() => (setPendingAsk(null), focus())} className="mt-3 text-sm text-zinc-500 hover:text-zinc-900">
              Pular
            </button>
          </div>
        )}

        {last && (
          <div
            className={cn(
              "animate-in rounded-2xl p-5 ring-1",
              last.ok ? (last.result?.paid === false ? "bg-amber-50 ring-amber-200" : "bg-emerald-50 ring-emerald-200") : "bg-red-50 ring-red-200",
            )}
          >
            <div className="flex items-start gap-3">
              {last.ok ? <CircleCheck className="mt-0.5 size-7 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 size-7 shrink-0 text-red-600" />}
              <div className="min-w-0 flex-1">
                <p className={cn("text-lg font-semibold", last.ok ? "text-emerald-900" : "text-red-900")}>{last.message}</p>
                {last.result ? (
                  <>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-700">
                      <span className="font-mono font-semibold">#{orderCode(last.result.number)}</span>
                      <OrderStatusBadge status={last.result.status} />
                      {!last.result.hasLabel && <span className="font-semibold text-orange-700">SEM ETIQUETA</span>}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {last.result.reseller} · {marketplaceLabel(last.result.marketplace)} · {last.result.items} {last.result.items === 1 ? "item" : "itens"}
                      {last.result.customer && ` · ${last.result.customer}`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/f/pedidos/${last.result.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-medium ring-1 ring-zinc-200">
                        <ExternalLink className="size-4" /> Abrir
                      </Link>
                      <a href={`/print/pedidos?ids=${last.result.id}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-medium ring-1 ring-zinc-200">
                        <Printer className="size-4" /> Cupom
                      </a>
                      {last.result.hasLabel && (
                        <a href={`/api/labels?ids=${last.result.id}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-medium ring-1 ring-zinc-200">
                          <Tag className="size-4" /> Etiqueta
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-1 font-mono text-sm text-red-700">Código lido: {last.code}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-zinc-200/70 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <p className="text-[15px] font-semibold">Nesta sessão</p>
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">{okCount} atualizados</span>
        </div>
        <div className="max-h-[60vh] divide-y divide-zinc-100 overflow-y-auto">
          {history.length === 0 && <p className="p-5 text-sm text-zinc-500">Os pedidos bipados aparecem aqui.</p>}
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className={cn("size-2 shrink-0 rounded-full", h.ok ? "bg-emerald-500" : "bg-red-500")} />
              <span className="font-mono font-semibold">{h.result ? `#${orderCode(h.result.number)}` : h.code}</span>
              <span className="min-w-0 flex-1 truncate text-zinc-500">{h.message}</span>
              <span className="text-xs text-zinc-400 tabular-nums">{formatTime(h.at)}</span>
            </div>
          ))}
        </div>
      </div>

      {camera && (
        <CameraScanner
          onClose={() => {
            setCamera(false);
            focus();
          }}
          onResult={(t) => process(t)}
        />
      )}
    </div>
  );
}
