import { showcaseBase } from "@/lib/showcase-base";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, Mail, MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { SmartImg } from "@/components/ui/smart-img";
import { instagramUrl, resolveLanding } from "@/lib/landing";
import { getShowcaseSupplier } from "@/lib/showcase";
import { contrastText, safeColor, whatsappLink } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getShowcaseSupplier(slug);
  if (!s) return { title: "Vitrine" };
  const c = resolveLanding(s);
  return {
    title: { absolute: `${s.name} | ${c.headline}`.slice(0, 70), template: `%s | ${s.name}` },
    description: c.subheadline.slice(0, 160),
    openGraph: { title: c.headline, description: c.subheadline.slice(0, 200), images: s.bannerUrl ? [s.bannerUrl] : s.logoUrl ? [s.logoUrl] : undefined },
  };
}

export default async function ShowcaseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getShowcaseSupplier(slug);
  if (!s) notFound();
  const base = await showcaseBase(s.slug);
  const color = safeColor(s.primaryColor);
  const c = resolveLanding(s);
  const wa = whatsappLink(s.whatsapp);
  const ig = instagramUrl(c.instagram);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.publicEmail) ? c.publicEmail : "";
  return (
    <div className="min-h-dvh bg-white pb-20 sm:pb-0" style={{ ["--brand" as string]: color, ["--brand-fg" as string]: contrastText(color) }}>
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={base || "/"} className="flex min-w-0 items-center gap-2.5">
            {s.logoUrl ? (
              <SmartImg src={s.logoUrl} alt={s.name} size={36} eager className="size-9 rounded-xl object-cover ring-1 ring-zinc-200" />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand font-bold text-brand-fg">{s.name[0]}</span>
            )}
            <span className="truncate text-[15px] font-semibold tracking-tight">{s.name}</span>
          </Link>
          <nav className="flex shrink-0 items-center gap-1">
            {s.showcasePublic && (
              <Link href={`${base}/catalogo`} className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>
                Catálogo
              </Link>
            )}
            <Link href="/entrar?next=/r" className={buttonClass("ghost", "sm")}>
              Entrar
            </Link>
            <Link href={`${base}/cadastro#cadastro`} className={buttonClass("primary", "sm")}>
              Quero revender
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:px-6">
          <p>
            {s.name}
            {s.city && ` · ${s.city}${s.state ? `/${s.state}` : ""}`}
          </p>
          <div className="flex items-center gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex size-9 items-center justify-center rounded-full ring-1 ring-zinc-200 hover:bg-zinc-50">
                <MessageCircle className="size-4" />
              </a>
            )}
            {ig && (
              <a href={ig} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex size-9 items-center justify-center rounded-full ring-1 ring-zinc-200 hover:bg-zinc-50">
                <AtSign className="size-4" />
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} aria-label="E-mail" className="flex size-9 items-center justify-center rounded-full ring-1 ring-zinc-200 hover:bg-zinc-50">
                <Mail className="size-4" />
              </a>
            )}
          </div>
          <p className="text-xs text-zinc-400">Plataforma Fornexo</p>
        </div>
      </footer>
    </div>
  );
}
