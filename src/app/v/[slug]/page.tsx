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

export default async function ShowcasePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogParams> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const s = await getShowcaseSupplier(slug);
  if (!s) notFound();
  const wa = whatsappLink(s.whatsapp, `Olá! Vi a vitrine da ${s.name} e quero saber mais sobre revenda.`);

  const hero = (
    <section className="relative overflow-hidden">
      {s.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <SmartImg src={s.bannerUrl} size={960} height={420} eager className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_80%_0%,var(--brand),transparent)] opacity-20" />
      )}
      {s.bannerUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />}
      <div className={`relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 ${s.bannerUrl ? "text-white" : ""}`}>
        <p className={`text-sm font-medium ${s.bannerUrl ? "text-white/80" : "text-brand"}`}>Programa de revenda</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">Revenda os produtos da {s.name} sem ter estoque</h1>
        {s.description && <p className={`mt-4 max-w-xl text-[15px] leading-relaxed ${s.bannerUrl ? "text-white/80" : "text-zinc-600"}`}>{s.description}</p>}
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Link href={`/v/${s.slug}/cadastro`} className={buttonClass("primary", "lg")}>
            Quero ser revendedor
          </Link>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className={buttonClass("secondary", "lg")}>
              Tirar dúvidas no WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );

  const steps = (
    <section className="mx-auto grid max-w-6xl gap-3 px-4 py-10 sm:grid-cols-4 sm:px-6">
      {[
        { icon: Store, t: "Escolha os produtos", d: "Fotos, títulos e descrições prontos para copiar." },
        { icon: Package, t: "Anuncie e venda", d: "Shopee, Mercado Livre, TikTok Shop e outros." },
        { icon: ScanBarcode, t: "Faça o pedido", d: "Anexe a etiqueta do marketplace no portal." },
        { icon: Truck, t: "Nós enviamos", d: s.shippingDeadline || "Separamos e enviamos direto ao seu cliente." },
      ].map((x) => (
        <div key={x.t} className="rounded-2xl bg-zinc-50 p-5 ring-1 ring-zinc-100">
          <x.icon className="size-5 text-brand" />
          <p className="mt-3 font-semibold">{x.t}</p>
          <p className="mt-1 text-sm text-zinc-500">{x.d}</p>
        </div>
      ))}
    </section>
  );

  if (!s.showcasePublic) {
    return (
      <>
        {hero}
        {steps}
        <div className="mx-auto max-w-md px-6 py-10 text-center">
          <Lock className="mx-auto size-6 text-zinc-400" />
          <p className="mt-3 font-semibold">Catálogo exclusivo para revendedores</p>
          <p className="mt-1 text-sm text-zinc-500">Cadastre-se para ver todos os produtos e preços.</p>
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
      {hero}
      {steps}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Catálogo</h2>
            <p className="text-sm text-zinc-500">{n} produtos disponíveis para revenda</p>
          </div>
        </div>
        <CatalogFilters categories={data.categories} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((p) => (
            <Link key={p.id} href={`/v/${s.slug}/p/${p.id}`} className="group overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/70 transition hover:shadow-md">
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
            return `/v/${s.slug}?${q.toString()}`;
          }}
        />
      </section>
    </>
  );
}
