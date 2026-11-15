import { PrintButton } from "@/components/supplier/print-button";
import { requireSupplier } from "@/lib/auth";
import { formatDateTime, orderCode } from "@/lib/format";
import { loadOrdersForPrint } from "@/lib/print-data";

export const metadata = { title: "Folha de separação" };

export default async function PickingPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { supplier } = await requireSupplier();
  const sp = await searchParams;
  const list = await loadOrdersForPrint(supplier.id, sp.ids);
  const agg = new Map<string, { sku: string; name: string; variant: string | null; qty: number; orders: number[] }>();
  for (const o of list)
    for (const it of o.items) {
      const cur = agg.get(it.sku) ?? { sku: it.sku, name: it.productName, variant: it.variantName, qty: 0, orders: [] };
      cur.qty += it.quantity;
      if (!cur.orders.includes(o.number)) cur.orders.push(o.number);
      agg.set(it.sku, cur);
    }
  const rows = [...agg.values()].sort((a, b) => a.sku.localeCompare(b.sku));
  const totalUnits = rows.reduce((s, r) => s + r.qty, 0);

  return (
    <>
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 print:hidden">
        <p className="text-sm font-semibold">Folha de separação · {list.length} pedidos</p>
        <PrintButton />
      </div>
      <div className="mx-auto my-4 max-w-[210mm] bg-white p-8 text-black shadow-sm print:my-0 print:p-0 print:shadow-none">
        <div className="flex items-end justify-between border-b-2 border-black pb-3">
          <div>
            <p className="text-xl font-bold">Folha de separação</p>
            <p className="text-sm">
              {supplier.name} · {formatDateTime(new Date())}
            </p>
          </div>
          <div className="text-right text-sm">
            <p>
              <b>{list.length}</b> pedidos
            </p>
            <p>
              <b>{totalUnits}</b> unidades · <b>{rows.length}</b> SKUs
            </p>
          </div>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="w-8 py-2" />
              <th className="py-2">SKU</th>
              <th className="py-2">Produto</th>
              <th className="py-2 text-right">Qtd</th>
              <th className="py-2 pl-4">Pedidos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sku} className="border-b border-zinc-300 align-top">
                <td className="py-2">
                  <span className="inline-block size-4 border border-black" />
                </td>
                <td className="py-2 pr-3 font-mono font-bold">{r.sku}</td>
                <td className="py-2 pr-3">
                  {r.name}
                  {r.variant && <b> · {r.variant}</b>}
                </td>
                <td className="py-2 text-right text-base font-bold">{r.qty}</td>
                <td className="py-2 pl-4 font-mono text-xs">{r.orders.map((n) => orderCode(n)).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-8 text-xs">Separado por: ____________________ Conferido por: ____________________</p>
      </div>
    </>
  );
}
