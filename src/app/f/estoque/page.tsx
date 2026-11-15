import { and, asc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { Boxes } from "lucide-react";
import { StockEditor } from "@/components/supplier/stock-editor";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, TabLinks } from "@/components/ui/misc";
import { SearchInput } from "@/components/ui/search-input";
import { db, products, variants } from "@/db";
import { requireSupplier } from "@/lib/auth";

export const metadata = { title: "Estoque" };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; baixo?: string }> }) {
  const { supplier } = await requireSupplier();
  const sp = await searchParams;
  const conds: SQL[] = [eq(products.supplierId, supplier.id), ne(products.status, "ARCHIVED")];
  if (sp.baixo) conds.push(sql`${variants.stock} <= ${products.lowStockAlert}`);
  if (sp.q) conds.push(or(ilike(products.name, `%${sp.q}%`), ilike(variants.sku, `%${sp.q}%`), ilike(variants.name, `%${sp.q}%`))!);
  const rows = await db
    .select({
      id: variants.id,
      productId: products.id,
      product: products.name,
      variant: variants.name,
      hasVariants: products.hasVariants,
      sku: variants.sku,
      stock: variants.stock,
      low: products.lowStockAlert,
      image: sql<string | null>`coalesce(${variants.imageUrl}, ${products.images}[1])`,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(...conds))
    .orderBy(asc(products.name), asc(variants.position))
    .limit(500);
  return (
    <>
      <PageHeader title="Estoque" description="Ajuste rápido de todas as variações. Toque no número para editar." />
      <TabLinks
        items={[
          { href: `/f/estoque${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`, label: "Todos", active: !sp.baixo },
          { href: `/f/estoque?baixo=1${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`, label: "Estoque baixo", active: !!sp.baixo },
        ]}
      />
      <SearchInput placeholder="Buscar produto, variação ou SKU" className="mb-4" />
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<Boxes />} title="Nada por aqui" description={sp.baixo ? "Nenhum item com estoque baixo." : "Cadastre produtos para controlar o estoque."} />
        ) : (
          <StockEditor rows={rows} />
        )}
      </Card>
    </>
  );
}
