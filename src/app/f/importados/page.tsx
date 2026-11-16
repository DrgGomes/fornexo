import { and, asc, count, desc, eq } from "drizzle-orm";
import { DownloadCloud, Lock } from "lucide-react";
import { AutoRefresh } from "@/components/importer/auto-refresh";
import { ExtensionSetup } from "@/components/importer/extension-setup";
import { ImportCard } from "@/components/importer/import-card";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, TabLinks } from "@/components/ui/misc";
import { categories, db, importedProducts } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { SOURCE_LABEL } from "@/lib/importer";

export const metadata = { title: "Importados" };

const TABS = [
  { id: "PENDING", label: "Para revisar" },
  { id: "CONVERTED", label: "Cadastrados" },
  { id: "DISCARDED", label: "Descartados" },
] as const;

export default async function ImportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supplier } = await requireSupplier();
  if (!supplier.importerEnabled) {
    return (
      <>
        <PageHeader title="Importados" />
        <Card>
          <EmptyState
            icon={<Lock />}
            title="Recurso não liberado"
            description="O importador de anúncios do Mercado Livre, Shopee, TikTok Shop e Temu ainda não está ativo na sua conta. Fale com o suporte para liberar."
          />
        </Card>
      </>
    );
  }
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "PENDING";
  const [rows, counts, cats] = await Promise.all([
    db
      .select()
      .from(importedProducts)
      .where(and(eq(importedProducts.supplierId, supplier.id), eq(importedProducts.status, tab)))
      .orderBy(desc(importedProducts.updatedAt))
      .limit(100),
    db
      .select({ s: importedProducts.status, n: count() })
      .from(importedProducts)
      .where(eq(importedProducts.supplierId, supplier.id))
      .groupBy(importedProducts.status),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.supplierId, supplier.id)).orderBy(asc(categories.name)),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.s, x.n])) as Record<string, number>;
  const total = Object.values(c).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title="Importados" description="Anúncios capturados pela extensão. Revise e cadastre com um clique." />
      <ExtensionSetup connectedAt={supplier.importTokenCreatedAt?.toISOString() ?? null} defaultOpen={total === 0} />
      <TabLinks items={TABS.map((t) => ({ href: `/f/importados?tab=${t.id}`, label: t.label, count: c[t.id], active: tab === t.id }))} />
      {tab === "PENDING" && <AutoRefresh />}
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<DownloadCloud />}
            title={tab === "PENDING" ? "Nenhum anúncio para revisar" : "Nada por aqui"}
            description={tab === "PENDING" ? "Abra um anúncio no Mercado Livre, Shopee, TikTok Shop ou Temu e toque em IMPORTAR. Ele aparece aqui na hora." : undefined}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <ImportCard
              key={r.id}
              categories={cats}
              item={{
                id: r.id,
                source: r.source,
                sourceLabel: SOURCE_LABEL[r.source] ?? r.source,
                sourceUrl: r.sourceUrl,
                title: r.title,
                description: r.description,
                price: r.price,
                images: r.images,
                attributes: r.attributes,
                variations: r.variations,
                status: r.status,
                productId: r.productId,
                createdAt: r.createdAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
