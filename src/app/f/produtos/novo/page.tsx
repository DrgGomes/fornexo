import { asc, eq } from "drizzle-orm";
import { ProductForm } from "@/components/supplier/product-form";
import { PageHeader } from "@/components/ui/misc";
import { categories, db } from "@/db";
import { requireSupplier } from "@/lib/auth";

export const metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  const { supplier } = await requireSupplier();
  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.supplierId, supplier.id))
    .orderBy(asc(categories.name));
  return (
    <>
      <PageHeader title="Novo produto" back="/f/produtos" />
      <ProductForm categories={cats} isNew />
    </>
  );
}
