"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { marketplaceLabel } from "@/lib/constants";
import { formatDateTime, orderCode } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ReceiptOrder = {
  id: string;
  number: number;
  createdAt: string;
  marketplace: string;
  externalOrderId: string | null;
  customerName: string | null;
  notes: string | null;
  hasLabel: boolean;
  reseller: string;
  items: { sku: string; productName: string; variantName: string | null; quantity: number }[];
};

type Format = "80" | "58" | "100x150" | "a4";
const FORMATS: { id: Format; label: string }[] = [
  { id: "80", label: "Térmica 80mm" },
  { id: "58", label: "Térmica 58mm" },
  { id: "100x150", label: "Etiqueta 10x15" },
  { id: "a4", label: "Folha A4" },
];

function Barcode({ value, height, width }: { value: string; height: number; width: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) JsBarcode(ref.current, value, { format: "CODE128", displayValue: true, fontSize: 14, height, width, margin: 0, font: "monospace" });
  }, [value, height, width]);
  return <svg ref={ref} className="mx-auto max-w-full" />;
}

export function PrintReceipts({ orders, supplierName, auto }: { orders: ReceiptOrder[]; supplierName: string; auto: boolean }) {
  const [format, setFormat] = useState<Format>("80");
  const [big, setBig] = useState(false);
  useEffect(() => {
    try {
      const f = localStorage.getItem("fx_print_format") as Format | null;
      if (f) setFormat(f);
      setBig(localStorage.getItem("fx_print_big") === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("fx_print_format", format);
      localStorage.setItem("fx_print_big", big ? "1" : "0");
    } catch {}
  }, [format, big]);
  useEffect(() => {
    if (auto && orders.length) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [auto, orders.length]);

  const page =
    format === "80" ? "80mm auto" : format === "58" ? "58mm auto" : format === "100x150" ? "100mm 150mm" : "A4";
  const width = format === "80" ? "72mm" : format === "58" ? "50mm" : format === "100x150" ? "92mm" : "100%";
  const thermal = format === "80" || format === "58";

  return (
    <>
      <style>{`@page { size: ${page}; margin: ${thermal ? "3mm 4mm" : "6mm"}; } @media print { .fx-receipt { break-after: page; } .fx-receipt:last-child { break-after: auto; } }`}</style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3 print:hidden">
        <p className="mr-auto text-sm font-semibold">
          {orders.length} {orders.length === 1 ? "cupom" : "cupons"}
        </p>
        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
          {FORMATS.map((f) => (
            <button key={f.id} onClick={() => setFormat(f.id)} className={cn("h-8 rounded-lg px-3 text-[13px] font-medium", format === f.id ? "bg-white shadow-sm" : "text-zinc-600")}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] font-medium text-zinc-700">
          <input type="checkbox" checked={big} onChange={(e) => setBig(e.target.checked)} className="size-4 accent-zinc-900" /> Letra grande
        </label>
        <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white">
          <Printer className="size-4" /> Imprimir
        </button>
      </div>

      <div className={cn("flex flex-col items-center gap-4 p-4 print:block print:p-0", format === "a4" && "print:grid print:grid-cols-2 print:gap-4")}>
        {orders.map((o) => (
          <div
            key={o.id}
            className={cn("fx-receipt bg-white font-mono text-black shadow-sm print:shadow-none", thermal ? "p-2" : "p-4 ring-1 ring-zinc-300 print:ring-black")}
            style={{ width, fontSize: big ? 14 : format === "58" ? 10.5 : 12, lineHeight: 1.35 }}
          >
            <div className="text-center">
              <p className="font-sans font-bold uppercase" style={{ fontSize: big ? 16 : 13 }}>
                {supplierName}
              </p>
              <p className="mt-0.5">PEDIDO DROPSHIPPING</p>
            </div>
            <div className="my-2 border-t border-dashed border-black" />
            <div className="text-center">
              <p className="font-sans font-extrabold tracking-wide" style={{ fontSize: big ? 30 : 24 }}>
                #{orderCode(o.number)}
              </p>
              <div className="mt-1">
                <Barcode value={orderCode(o.number)} height={thermal ? 46 : 56} width={format === "58" ? 1.4 : 2} />
              </div>
            </div>
            <div className="my-2 border-t border-dashed border-black" />
            <p>Data: {formatDateTime(o.createdAt)}</p>
            <p>Revendedor: {o.reseller}</p>
            <p>
              Canal: {marketplaceLabel(o.marketplace)}
              {o.externalOrderId ? ` ${o.externalOrderId}` : ""}
            </p>
            {o.customerName && <p>Cliente: {o.customerName}</p>}
            <p className="font-bold">Etiqueta: {o.hasLabel ? "ANEXADA" : "PENDENTE"}</p>
            <div className="my-2 border-t border-dashed border-black" />
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="w-8 pr-1 align-top">QTD</th>
                  <th className="align-top">ITEM</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it, i) => (
                  <tr key={i} className="align-top">
                    <td className="pr-1 font-bold" style={{ fontSize: big ? 18 : 14 }}>
                      {it.quantity}x
                    </td>
                    <td className="pb-1.5">
                      <span className="font-bold">{it.sku}</span>
                      <br />
                      {it.productName}
                      {it.variantName && (
                        <>
                          <br />
                          <span className="font-bold">{it.variantName}</span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="my-2 border-t border-dashed border-black" />
            <p className="font-bold">TOTAL DE PEÇAS: {o.items.reduce((s, i) => s + i.quantity, 0)}</p>
            {o.notes && (
              <>
                <div className="my-2 border-t border-dashed border-black" />
                <p className="font-bold">OBS:</p>
                <p className="whitespace-pre-wrap">{o.notes}</p>
              </>
            )}
            <div className="my-2 border-t border-dashed border-black" />
            <div className="flex justify-between" style={{ fontSize: big ? 12 : 10 }}>
              <span>[ ] Separado</span>
              <span>[ ] Conferido</span>
              <span>[ ] Embalado</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
