import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/supplier/product-form";
import { PageHeader } from "@/components/ui/misc";
import { categories, db, products, variants } from "@/db";
import { requireSupplier } from "@/lib/auth";

export const metadata = { title: "Editar produto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supplier } = await requireSupplier();
  const [p, cats] = await Promise.all([
    db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.supplierId, supplier.id)),
      with: { variants: { orderBy: asc(variants.position) } },
    }),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.supplierId, supplier.id)).orderBy(asc(categories.name)),
  ]);
  if (!p) notFound();
  return (
    <>
      <PageHeader title={p.name} description={`SKU ${p.sku}`} back="/f/produtos" />
      <ProductForm
        isNew={false}
        categories={cats}
        initial={{
          id: p.id,
          name: p.name,
          sku: p.sku,
          brand: p.brand,
          categoryId: p.categoryId,
          titleShopee: p.titleShopee,
          titleMl: p.titleMl,
          description: p.description,
          images: p.images,
          videoUrl: p.videoUrl,
          price: p.price,
          suggestedPrice: p.suggestedPrice,
          costPrice: p.costPrice,
          weightGrams: p.weightGrams,
          heightCm: p.heightCm,
          widthCm: p.widthCm,
          lengthCm: p.lengthCm,
          ean: p.ean,
          ncm: p.ncm,
          tags: p.tags,
          status: p.status,
          featured: p.featured,
          lowStockAlert: p.lowStockAlert,
          hasVariants: p.hasVariants,
          optionNames: p.optionNames,
          variants: p.variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            options: v.options,
            price: v.price,
            stock: v.stock,
            imageUrl: v.imageUrl,
            ean: v.ean,
          })),
        }}
      />
    </>
  );
}
