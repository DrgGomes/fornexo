import { PrintReceipts } from "@/components/supplier/print-receipts";
import { requireSupplier } from "@/lib/auth";
import { loadOrdersForPrint } from "@/lib/print-data";

export const metadata = { title: "Imprimir pedidos" };

export default async function PrintOrdersPage({ searchParams }: { searchParams: Promise<{ ids?: string; auto?: string }> }) {
  const { supplier } = await requireSupplier();
  const sp = await searchParams;
  const list = await loadOrdersForPrint(supplier.id, sp.ids);
  return (
    <PrintReceipts
      supplierName={supplier.name}
      auto={sp.auto !== "0"}
      orders={list.map((o) => ({
        id: o.id,
        number: o.number,
        createdAt: o.createdAt.toISOString(),
        marketplace: o.marketplace,
        externalOrderId: o.externalOrderId,
        customerName: o.customerName,
        notes: o.notes,
        hasLabel: !!o.labelFileId,
        reseller: o.reseller.storeName || o.reseller.name,
        items: o.items.map((i) => ({ sku: i.sku, productName: i.productName, variantName: i.variantName, quantity: i.quantity })),
      }))}
    />
  );
}
