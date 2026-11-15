import { Store } from "lucide-react";
import { CatalogFilters } from "@/components/reseller/catalog-filters";
import { ProductCard } from "@/components/reseller/product-card";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { requireReseller } from "@/lib/auth";
import { loadCatalog, type CatalogParams } from "@/lib/catalog";

export const metadata = { title: "Catálogo" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const { reseller, supplier } = await requireReseller();
  const sp = await searchParams;
  const data = await loadCatalog({ supplierId: supplier.id, resellerId: reseller.id, params: sp });
  const qs = (p: number) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    q.set("page", String(p));
    return `/r/catalogo?${q.toString()}`;
  };
  return (
    <>
      <PageHeader title="Catálogo" description={`${data.total} produtos disponíveis para revenda`} />
      <CatalogFilters categories={data.categories} />
      {data.items.length === 0 ? (
        <Card>
          <EmptyState icon={<Store />} title="Nenhum produto encontrado" description="Tente outra busca ou categoria." />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.items.map((p) => (
            <ProductCard key={p.id} p={p} href={`/r/catalogo/${p.id}`} />
          ))}
        </div>
      )}
      <Pagination page={data.page} totalPages={data.totalPages} makeHref={qs} />
    </>
  );
}
