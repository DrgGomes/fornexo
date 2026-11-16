import { showcaseBase } from "@/lib/showcase-base";
import Link from "next/link";
import { SmartImg } from "@/components/ui/smart-img";
import { and, count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Lock, Package, ScanBarcode, Store, Truck } from "lucide-react";
import { CatalogFilters } from "@/components/reseller/catalog-filters";
import { buttonClass } from "@/components/ui/button";
import { Pagination } from "@/components/ui/misc";
import { db, products } from "@/db";
import { loadCatalog, type CatalogParams } from "@/lib/catalog";
import { brl } from "@/lib/format";
import { getShowcaseSupplier } from "@/lib/showcase";
import { whatsappLink } from "@/lib/utils";

export const metadata = { title: "Catálogo" };

export default async function ShowcaseCatalogPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogParams> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const s = await getShowcaseSupplier(slug);
  if (!s) notFound();
  const base = await showcaseBase(s.slug);
  if (!s.showcasePublic) {
    return (
      <>
        <div className="mx-auto max-w-md px-6 py-10 text-center">
          <Lock className="mx-auto size-6 text-zinc-400" />
          <p className="mt-3 font-semibold">Catálogo exclusivo para revendedores</p>
          <p className="mt-1 text-sm text-zinc-500">Cadastre-se para ver todos os produtos e preços.</p>
          <Link href={`${base}/cadastro#cadastro`} className={buttonClass("primary", "md", "mt-5")}>
            Quero revender
          </Link>
        </div>
      </>
    );
  }

  const [data, [{ n }]] = await Promise.all([
    loadCatalog({ supplierId: s.id, params: sp, perPage: 24 }),
    db.select({ n: count() }).from(products).where(and(eq(products.supplierId, s.id), eq(products.status, "ACTIVE"))),
  ]);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Catálogo</h1>
            <p className="text-sm text-zinc-500">{n} produtos disponíveis para revenda</p>
          </div>
        </div>
        <CatalogFilters categories={data.categories} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((p) => (
            <Link key={p.id} href={`${base}/p/${p.id}`} className="group overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/70 transition hover:shadow-md">
              <div className="aspect-square overflow-hidden bg-zinc-100">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <SmartImg src={p.image} alt={p.name} size={280} className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm leading-snug font-medium">{p.name}</p>
                {s.showcaseShowPrices ? (
                  <p className="mt-1.5 text-[15px] font-semibold">
                    {brl(p.price)} <span className="text-xs font-normal text-zinc-500">p/ revenda</span>
                  </p>
                ) : p.suggestedPrice ? (
                  <p className="mt-1.5 text-xs text-zinc-500">Venda sugerida {brl(p.suggestedPrice)}</p>
                ) : null}
                {p.sold > 0 && <p className="mt-0.5 text-[11px] text-zinc-400">{p.sold} vendidos nos últimos 30 dias</p>}
              </div>
            </Link>
          ))}
        </div>
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          makeHref={(pg) => {
            const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
            q.set("page", String(pg));
            return `${base}/catalogo?${q.toString()}`;
          }}
        />
      </section>
    </>
  );
}
