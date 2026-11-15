import { ScanStation } from "@/components/supplier/scan-station";
import { PageHeader } from "@/components/ui/misc";
import { requireSupplier } from "@/lib/auth";

export const metadata = { title: "Bipagem" };

export default async function ScanPage() {
  await requireSupplier();
  return (
    <>
      <PageHeader title="Bipagem de pedidos" description="Escolha o status, bipe o código de barras do cupom e o revendedor é avisado na hora." />
      <ScanStation />
    </>
  );
}
