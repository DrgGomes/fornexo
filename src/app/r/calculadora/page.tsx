import { and, asc, eq } from "drizzle-orm";
import { StandaloneCalculator } from "@/components/reseller/standalone-calculator";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { db, products } from "@/db";
import { requireReseller } from "@/lib/auth";
import { loadPricing } from "@/lib/reseller-data";

export const metadata = { title: "Calculadora de preço" };

export default async function CalculatorPage() {
  const { reseller, supplier } = await requireReseller();
  const [list, pricing] = await Promise.all([
    db
      .select({ id: products.id, name: products.name, price: products.price, suggestedPrice: products.suggestedPrice })
      .from(products)
      .where(and(eq(products.supplierId, supplier.id), eq(products.status, "ACTIVE")))
      .orderBy(asc(products.name))
      .limit(500),
    loadPricing(reseller),
  ]);
  return (
    <>
      <PageHeader title="Calculadora de preço" description="Descubra por quanto vender em cada plataforma com suas taxas, impostos e margem." />
      <Card className="max-w-3xl">
        <CardBody className="pt-5">
          <StandaloneCalculator products={list} profiles={pricing.profiles} costs={pricing.costs} handlingFee={supplier.handlingFee} />
        </CardBody>
      </Card>
    </>
  );
}
