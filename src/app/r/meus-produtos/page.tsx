import { Heart } from "lucide-react";
import { ProductCard } from "@/components/reseller/product-card";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { SearchInput } from "@/components/ui/search-input";
import { requireReseller } from "@/lib/auth";
import { loadCatalog, type CatalogParams } from "@/lib/catalog";

export const metadata = { title: "Meus produtos" };

export default async function MyProductsPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const { reseller, supplier } = await requireReseller();
  const sp = await searchParams;
  const data = await loadCatalog({ supplierId: supplier.id, resellerId: reseller.id, params: sp, onlyFavorites: true, perPage: 48 });
  return (
    <>
      <PageHeader title="Meus produtos" description="Os produtos que você escolheu anunciar. Acompanhe estoque e acesse os materiais rápido." />
      <SearchInput placeholder="Buscar nos meus produtos" className="mb-4" />
      {data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Heart />}
            title="Nenhum produto escolhido"
            description="No catálogo, toque no coração dos produtos que você vai anunciar. Eles ficam reunidos aqui."
            action={<ButtonLink href="/r/catalogo">Abrir catálogo</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.items.map((p) => (
            <ProductCard key={p.id} p={p} href={`/r/catalogo/${p.id}`} />
          ))}
        </div>
      )}
      <Pagination page={data.page} totalPages={data.totalPages} makeHref={(p) => `/r/meus-produtos?page=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} />
    </>
  );
}
