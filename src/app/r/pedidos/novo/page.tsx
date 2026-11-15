import { OrderForm } from "@/components/reseller/order-form";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireReseller } from "@/lib/auth";

export const metadata = { title: "Novo pedido" };

export default async function NewOrderPage() {
  const { reseller, supplier } = await requireReseller();
  return (
    <>
      <PageHeader title="Novo pedido" description="Vendeu no marketplace? Adicione os produtos, anexe a etiqueta e pronto." back="/r/pedidos" />
      <Card className="mx-auto max-w-2xl">
        <CardBody className="pt-5">
          <OrderForm requireLabel={supplier.requireLabel} handlingFee={supplier.handlingFee} balance={reseller.balance} myMarketplaces={reseller.marketplaces} />
        </CardBody>
      </Card>
    </>
  );
}
