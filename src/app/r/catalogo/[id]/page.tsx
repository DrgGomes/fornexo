import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ProductWorkspace } from "@/components/reseller/product-workspace";
import { PageHeader } from "@/components/ui/misc";
import { db, favorites, products, variants } from "@/db";
import { requireReseller } from "@/lib/auth";
import { loadPricing } from "@/lib/reseller-data";

export const metadata = { title: "Produto" };

export default async function ResellerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { reseller, supplier } = await requireReseller();
  const p = await db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.supplierId, supplier.id), eq(products.status, "ACTIVE")),
    with: { variants: { orderBy: asc(variants.position) }, category: { columns: { name: true } } },
  });
  if (!p) notFound();
  const [fav, pricing] = await Promise.all([
    db.query.favorites.findFirst({ where: and(eq(favorites.resellerId, reseller.id), eq(favorites.productId, p.id)) }),
    loadPricing(reseller),
  ]);
  return (
    <>
      <PageHeader title="" back="/r/catalogo" />
      <div className="-mt-4">
        <ProductWorkspace
          favorite={!!fav}
          handlingFee={supplier.handlingFee}
          profiles={pricing.profiles}
          costs={pricing.costs}
          requireLabel={supplier.requireLabel}
          balance={reseller.balance}
          myMarketplaces={reseller.marketplaces}
          p={{
            id: p.id,
            name: p.name,
            sku: p.sku,
            brand: p.brand,
            category: p.category?.name ?? null,
            titleShopee: p.titleShopee,
            titleMl: p.titleMl,
            description: p.description,
            images: p.images,
            videoUrl: p.videoUrl,
            price: p.price,
            suggestedPrice: p.suggestedPrice,
            weightGrams: p.weightGrams,
            heightCm: p.heightCm,
            widthCm: p.widthCm,
            lengthCm: p.lengthCm,
            ean: p.ean,
            ncm: p.ncm,
            hasVariants: p.hasVariants,
            optionNames: p.optionNames,
            variants: p.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, options: v.options, price: v.price ?? p.price, stock: v.stock, image: v.imageUrl, ean: v.ean })),
          }}
        />
      </div>
    </>
  );
}
