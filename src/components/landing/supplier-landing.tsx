import Link from "next/link";
import { ArrowRight, Check, ChevronDown, MessageCircle, Quote } from "lucide-react";
import { SignupResellerForm } from "@/components/auth/signup-reseller-form";
import { buttonClass } from "@/components/ui/button";
import { SmartImg } from "@/components/ui/smart-img";
import type { SupplierRow } from "@/lib/auth";
import { brl } from "@/lib/format";
import { autoRules, type LandingConfig } from "@/lib/landing";
import { cn, whatsappLink } from "@/lib/utils";

export type LandingProduct = { id: string; name: string; image: string | null; price: number; suggestedPrice: number | null };
export type LandingCategory = { id: string; name: string; count: number };

function Section({ id, eyebrow, title, children, className }: { id?: string; eyebrow?: string; title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20", className)}>
      {(eyebrow || title) && (
        <div className="mb-8 max-w-2xl sm:mb-10">
          {eyebrow && <p className="text-sm font-semibold text-brand">{eyebrow}</p>}
          {title && <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>}
        </div>
      )}
      {children}
    </section>
  );
}

export function SupplierLanding({
  supplier: s,
  config: c,
  productCount,
  categories,
  products,
  base,
}: {
  base: string;
  supplier: SupplierRow;
  config: LandingConfig;
  productCount: number;
  categories: LandingCategory[];
  products: LandingProduct[];
}) {
  const wa = whatsappLink(s.whatsapp, `Olá! Vi a página de revenda da ${s.name} e quero saber mais.`);
  const stats = c.stats
    .map((x) => ({ ...x, value: x.value.replace("{produtos}", productCount > 0 ? `${productCount}+` : "Vários") }))
    .filter((x) => x.value && x.label);
  const rules = [...(c.showAutoRules ? autoRules(s) : []), ...c.rules.filter(Boolean)];
  const hasBanner = c.heroStyle === "image" && !!s.bannerUrl;
  const darkHero = hasBanner || c.heroStyle === "dark";
  const cta = c.ctaText || "Quero ser revendedor";

  return (
    <div className="bg-white text-zinc-900">
      {/* HERO */}
      <section className={cn("relative overflow-hidden", darkHero ? "bg-zinc-950 text-white" : "bg-white")}>
        {hasBanner ? (
          <>
            <SmartImg src={s.bannerUrl} size={1280} height={720} eager className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
          </>
        ) : (
          <div
            className={cn("absolute inset-0", darkHero ? "opacity-60" : "opacity-[0.16]")}
            style={{ background: "radial-gradient(70% 90% at 85% 0%, var(--brand), transparent), radial-gradient(50% 60% at 0% 100%, var(--brand), transparent)" }}
          />
        )}
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-medium",
                darkHero ? "bg-white/10 text-white ring-1 ring-white/20" : "bg-brand/10 text-brand",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" /> Programa de revenda {s.name}
            </span>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{c.headline}</h1>
            {c.subheadline && <p className={cn("mt-5 max-w-xl text-[17px] leading-relaxed text-pretty", darkHero ? "text-white/80" : "text-zinc-600")}>{c.subheadline}</p>}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#cadastro" className={buttonClass("primary", "lg", "h-13 px-7 text-base")}>
                {cta} <ArrowRight />
              </a>
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "inline-flex h-13 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-medium",
                    darkHero ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15" : "bg-white ring-1 ring-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  <MessageCircle className="size-4" /> Falar no WhatsApp
                </a>
              )}
            </div>
          </div>
          {products.length >= 3 && (
            <div className="relative hidden lg:block">
              <div className="grid grid-cols-2 gap-3">
                {products.slice(0, 4).map((p, i) => (
                  <div
                    key={p.id}
                    className={cn("overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5", i % 2 === 1 && "translate-y-8")}
                  >
                    <SmartImg src={p.image} alt={p.name} size={260} eager className="aspect-square w-full object-cover" />
                    <div className="p-3 text-zinc-900">
                      <p className="line-clamp-1 text-[13px] font-medium">{p.name}</p>
                      {p.suggestedPrice ? <p className="text-xs text-zinc-500">Venda por {brl(p.suggestedPrice)}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* NUMEROS */}
      {c.sections.stats && stats.length > 0 && (
        <section className="border-y border-zinc-100 bg-zinc-50">
          <div className={cn("mx-auto grid max-w-6xl gap-px px-4 sm:px-6", stats.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : stats.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
            {stats.map((x, i) => (
              <div key={i} className="px-2 py-8 text-center">
                <p className="text-3xl font-semibold tracking-tight text-brand sm:text-4xl">{x.value}</p>
                <p className="mt-1 text-sm text-zinc-500">{x.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* O QUE FORNECEMOS */}
      {c.sections.supply && (c.supplyText || (c.showCategories && categories.length > 0)) && (
        <Section eyebrow="Catálogo" title={c.supplyTitle || "O que fornecemos"}>
          {c.supplyText && <p className="-mt-4 mb-8 max-w-3xl text-[17px] leading-relaxed whitespace-pre-line text-zinc-600">{c.supplyText}</p>}
          {c.showCategories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`${base}/catalogo?cat=${cat.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[15px] font-medium ring-1 ring-zinc-200 transition hover:ring-brand"
                >
                  {cat.name}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{cat.count}</span>
                </Link>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* PRODUTOS */}
      {c.sections.products && products.length > 0 && (
        <section className="bg-zinc-50">
          <Section eyebrow="Prévia" title={c.productsTitle || "Alguns produtos do catálogo"} className="pb-14 sm:pb-16">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <Link key={p.id} href={`${base}/p/${p.id}`} className="group overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/70 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="aspect-square overflow-hidden bg-zinc-100">
                    <SmartImg src={p.image} alt={p.name} size={280} className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm leading-snug font-medium">{p.name}</p>
                    {s.showcaseShowPrices ? (
                      <p className="mt-1.5 text-[15px] font-semibold">
                        {brl(p.price)} <span className="text-xs font-normal text-zinc-500">para revenda</span>
                      </p>
                    ) : null}
                    {p.suggestedPrice ? <p className="text-xs text-zinc-500">Venda sugerida {brl(p.suggestedPrice)}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href={`${base}/catalogo`} className={buttonClass("secondary", "lg")}>
                Ver catálogo completo <ArrowRight />
              </Link>
            </div>
          </Section>
        </section>
      )}

      {/* VANTAGENS */}
      {c.sections.benefits && c.benefits.some((b) => b.title) && (
        <Section eyebrow="Vantagens" title={`Por que revender ${s.name}`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.benefits
              .filter((b) => b.title)
              .map((b, i) => (
                <div key={i} className="rounded-3xl bg-zinc-50 p-6 ring-1 ring-zinc-100">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-fg">
                    <Check className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{b.title}</h3>
                  {b.text && <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-600">{b.text}</p>}
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* COMO FUNCIONA */}
      {c.sections.steps && c.steps.some((x) => x.title) && (
        <section className="bg-zinc-950 text-white">
          <Section eyebrow="Passo a passo" title="Como funciona">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {c.steps
                .filter((x) => x.title)
                .map((x, i) => (
                  <div key={i} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                    <span className="font-mono text-sm font-semibold text-brand">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-3 text-lg font-semibold">{x.title}</h3>
                    {x.text && <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-400">{x.text}</p>}
                  </div>
                ))}
            </div>
          </Section>
        </section>
      )}

      {/* REGRAS */}
      {c.sections.rules && rules.length > 0 && (
        <Section eyebrow="Combinados" title="Regras da parceria">
          <ul className="grid gap-3 sm:grid-cols-2">
            {rules.map((r, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200/70">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Check className="size-3.5" />
                </span>
                <span className="text-[15px] leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* DEPOIMENTOS */}
      {c.sections.testimonials && c.testimonials.some((t) => t.text) && (
        <section className="bg-zinc-50">
          <Section eyebrow="Depoimentos" title="Quem já revende">
            <div className="grid gap-4 md:grid-cols-3">
              {c.testimonials
                .filter((t) => t.text)
                .map((t, i) => (
                  <figure key={i} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-zinc-200/70">
                    <Quote className="size-6 text-brand" />
                    <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-zinc-700">{t.text}</blockquote>
                    <figcaption className="mt-5">
                      <p className="font-semibold">{t.name}</p>
                      {t.role && <p className="text-sm text-zinc-500">{t.role}</p>}
                    </figcaption>
                  </figure>
                ))}
            </div>
          </Section>
        </section>
      )}

      {/* FAQ */}
      {c.sections.faq && c.faq.some((f) => f.q) && (
        <Section eyebrow="Dúvidas" title="Perguntas frequentes" className="max-w-3xl">
          <div className="divide-y divide-zinc-100 rounded-3xl ring-1 ring-zinc-200/70">
            {c.faq
              .filter((f) => f.q)
              .map((f, i) => (
                <details key={i} className="group px-5 py-4 open:bg-zinc-50/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 text-zinc-400 transition group-open:rotate-180" />
                  </summary>
                  {f.a && <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-zinc-600">{f.a}</p>}
                </details>
              ))}
          </div>
        </Section>
      )}

      {/* CADASTRO */}
      <section id="cadastro" className="scroll-mt-16 bg-zinc-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-sm font-semibold text-brand">Cadastro gratuito</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{c.signupTitle || `Comece a revender ${s.name} hoje`}</h2>
            {c.signupText && <p className="mt-4 text-[17px] leading-relaxed text-zinc-400">{c.signupText}</p>}
            <ul className="mt-6 grid gap-2.5 text-[15px] text-zinc-300">
              {["Catálogo completo com fotos e descrições", "Pedidos com etiqueta do marketplace", "Acompanhamento em tempo real"].map((x) => (
                <li key={x} className="flex items-center gap-2.5">
                  <Check className="size-4 text-brand" /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-5 text-zinc-900 shadow-2xl sm:p-7">
            <SignupResellerForm slug={s.slug} />
            <p className="mt-4 text-center text-sm text-zinc-500">
              Já tem conta?{" "}
              <Link href="/entrar?next=/r" className="font-medium text-zinc-900 hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA fixo no celular */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <a href="#cadastro" className={buttonClass("primary", "lg", "w-full")}>
          {cta}
        </a>
      </div>
    </div>
  );
}
