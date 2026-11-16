import Link from "next/link";
import { SmartImg } from "@/components/ui/smart-img";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { getShowcaseSupplier } from "@/lib/showcase";
import { contrastText, safeColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getShowcaseSupplier(slug);
  if (!s) return { title: "Vitrine" };
  return {
    title: { default: `${s.name} | Revenda`, template: `%s | ${s.name}` },
    description: s.description ?? `Revenda os produtos de ${s.name} no seu marketplace.`,
    openGraph: { title: s.name, description: s.description ?? undefined, images: s.bannerUrl ? [s.bannerUrl] : s.logoUrl ? [s.logoUrl] : undefined },
  };
}

export default async function ShowcaseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getShowcaseSupplier(slug);
  if (!s) notFound();
  const color = safeColor(s.primaryColor);
  return (
    <div className="min-h-dvh bg-white" style={{ ["--brand" as string]: color, ["--brand-fg" as string]: contrastText(color) }}>
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={`/v/${s.slug}`} className="flex min-w-0 items-center gap-2.5">
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <SmartImg src={s.logoUrl} alt={s.name} size={36} eager className="size-9 rounded-xl object-cover ring-1 ring-zinc-200" />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand font-bold text-brand-fg">{s.name[0]}</span>
            )}
            <span className="truncate text-[15px] font-semibold tracking-tight">{s.name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link href={`/entrar?next=/r`} className={buttonClass("ghost", "sm")}>
              Entrar
            </Link>
            <Link href={`/v/${s.slug}/cadastro`} className={buttonClass("primary", "sm")}>
              Quero revender
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t border-zinc-100 py-8 text-center text-xs text-zinc-400">
        {s.name}
        {s.city && ` · ${s.city}${s.state ? `/${s.state}` : ""}`} · Plataforma Fornexo
      </footer>
    </div>
  );
}
