import Link from "next/link";
import { SmartImg } from "@/components/ui/smart-img";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { db, products, variants } from "@/db";
import { brl } from "@/lib/format";
import { getShowcaseSupplier } from "@/lib/showcase";
import { whatsappLink } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const s = await getShowcaseSupplier(slug);
  if (!s) return {};
  const p = await db.query.products.findFirst({ where: and(eq(products.id, id), eq(products.supplierId, s.id)), columns: { name: true, images: true } });
  return p ? { title: p.name, openGraph: { title: p.name, images: p.images.slice(0, 1) } } : {};
}

export default async function ShowcaseProduct({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const s = await getShowcaseSupplier(slug);
  if (!s || !s.showcasePublic) notFound();
  const p = await db.query.products.findFirst({
    where: and(eq(products.id, id), eq(products.supplierId, s.id), eq(products.status, "ACTIVE")),
    with: { variants: { orderBy: asc(variants.position) } },
  });
  if (!p) notFound();
  const available = p.variants.some((v) => v.stock > 0);
  const wa = whatsappLink(s.whatsapp, `Olá! Tenho interesse em revender o produto ${p.name}.`);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link href={`/v/${s.slug}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
        <ChevronLeft className="size-4" /> Catálogo
      </Link>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="no-scrollbar flex aspect-square snap-x snap-mandatory overflow-x-auto rounded-3xl bg-zinc-100">
            {p.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <SmartImg key={src} src={src} alt={`${p.name} ${i + 1}`} size={600} eager={i === 0} className="size-full shrink-0 snap-center object-cover" />
            ))}
          </div>
          {p.images.length > 1 && <p className="mt-2 text-center text-xs text-zinc-400">Deslize para ver {p.images.length} fotos</p>}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{p.name}</h1>
          <div className="mt-4 flex flex-wrap items-end gap-6">
            {s.showcaseShowPrices && (
              <div>
                <p className="text-xs text-zinc-500">Preço para revendedor</p>
                <p className="text-3xl font-semibold">{brl(p.price)}</p>
              </div>
            )}
            {p.suggestedPrice ? (
              <div>
                <p className="text-xs text-zinc-500">Preço de venda sugerido</p>
                <p className="text-xl font-semibold text-zinc-600">{brl(p.suggestedPrice)}</p>
              </div>
            ) : null}
          </div>
          <p className={`mt-3 text-sm font-medium ${available ? "text-emerald-600" : "text-red-600"}`}>{available ? "Disponível em estoque" : "Temporariamente esgotado"}</p>
          {p.hasVariants && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">{p.optionNames.join(" / ")}</p>
              <div className="flex flex-wrap gap-2">
                {p.variants.map((v) => (
                  <span key={v.id} className={`rounded-xl px-3 py-1.5 text-[13px] ring-1 ${v.stock > 0 ? "ring-zinc-200" : "text-zinc-400 line-through ring-zinc-100"}`}>
                    {v.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href={`/v/${s.slug}/cadastro`} className={buttonClass("primary", "lg")}>
              Quero revender este produto
            </Link>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className={buttonClass("secondary", "lg")}>
                WhatsApp
              </a>
            )}
          </div>
          <div className="mt-8 border-t border-zinc-100 pt-6">
            <p className="mb-2 text-sm font-semibold">Descrição</p>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-600">{p.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
