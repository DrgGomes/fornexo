"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Eye, EyeOff, Monitor, Plus, RotateCcw, Smartphone, Trash2 } from "lucide-react";
import { resetLanding, saveLanding } from "@/actions/landing";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/components/ui/use-action";
import type { LandingConfig, LandingSection } from "@/lib/landing";
import { cn } from "@/lib/utils";

type Brand = { logoUrl: string; bannerUrl: string; primaryColor: string; whatsapp: string };

function Block({
  title,
  description,
  section,
  visible,
  onToggle,
  defaultOpen,
  children,
}: {
  title: string;
  description?: string;
  section?: LandingSection;
  visible?: boolean;
  onToggle?: (v: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={cn("rounded-2xl bg-white ring-1 ring-zinc-200/70", section && !visible && "opacity-70")}>
      <div className="flex items-center gap-2 px-4 py-3.5 sm:px-5">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <ChevronDown className={cn("size-4 shrink-0 text-zinc-400 transition", open && "rotate-180")} />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold">{title}</span>
            {description && <span className="block truncate text-xs text-zinc-500">{description}</span>}
          </span>
        </button>
        {section && onToggle && (
          <button
            type="button"
            onClick={() => onToggle(!visible)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium",
              visible ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500",
            )}
            title={visible ? "Seção visível" : "Seção oculta"}
          >
            {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            {visible ? "Visível" : "Oculta"}
          </button>
        )}
      </div>
      {open && <div className="grid gap-4 border-t border-zinc-100 px-4 py-4 sm:px-5">{children}</div>}
    </div>
  );
}

function ListEditor<T>({
  items,
  onChange,
  max,
  empty,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  max: number;
  empty: T;
  addLabel: string;
  render: (item: T, set: (v: T) => void) => React.ReactNode;
}) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const a = [...items];
    [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };
  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
          <div className="grid min-w-0 flex-1 gap-2">{render(it, (v) => onChange(items.map((x, k) => (k === i ? v : x))))}</div>
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-zinc-800" aria-label="Subir">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-zinc-800" aria-label="Descer">
              <ArrowDown className="size-4" />
            </button>
            <button type="button" onClick={() => onChange(items.filter((_, k) => k !== i))} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-red-600" aria-label="Remover">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button variant="secondary" size="sm" onClick={() => onChange([...items, structuredClone(empty)])} className="justify-self-start">
          <Plus /> {addLabel}
        </Button>
      )}
    </div>
  );
}

const COLORS = ["#4f46e5", "#0f172a", "#2563eb", "#0891b2", "#059669", "#16a34a", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#9333ea", "#7c3aed"];

export function LandingEditor({
  initial,
  brand: brandInitial,
  landingUrl,
  previewPath,
  autoRules,
}: {
  initial: LandingConfig;
  brand: Brand;
  landingUrl: string;
  previewPath: string;
  autoRules: string[];
}) {
  const [c, setC] = useState(initial);
  const [brand, setBrand] = useState(brandInitial);
  const [previewKey, setPreviewKey] = useState(0);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const { exec, pending } = useAction();
  const set = <K extends keyof LandingConfig>(k: K, v: LandingConfig[K]) => setC((s) => ({ ...s, [k]: v }));
  const sec = (k: LandingSection) => ({ section: k, visible: c.sections[k], onToggle: (v: boolean) => set("sections", { ...c.sections, [k]: v }) });

  const save = () => exec(() => saveLanding({ landing: c, brand }), { onSuccess: () => setPreviewKey((k) => k + 1) });

  return (
    <div className="grid gap-5 pb-24 xl:grid-cols-[minmax(0,1fr)_460px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-2xl bg-zinc-900 p-4 text-white sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Link da sua página de cadastro</p>
            <p className="mt-0.5 truncate font-mono text-xs text-zinc-400">{landingUrl}</p>
          </div>
          <div className="flex gap-2">
            <CopyButton text={landingUrl} label="Copiar" className="bg-white text-zinc-900 hover:bg-zinc-100" />
            <a href={landingUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[13px] font-medium hover:bg-white/20">
              <ExternalLink className="size-4" /> Abrir
            </a>
          </div>
        </div>

        <Block title="Topo da página" description="Título, chamada, botão e imagem de fundo" defaultOpen>
          <Field label="Título principal" aside={`${c.headline.length}/140`}>
            <Input value={c.headline} maxLength={140} onChange={(e) => set("headline", e.target.value)} />
          </Field>
          <Field label="Texto de apoio" aside={`${c.subheadline.length}/400`}>
            <Textarea value={c.subheadline} maxLength={400} onChange={(e) => set("subheadline", e.target.value)} className="min-h-20" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Texto do botão">
              <Input value={c.ctaText} maxLength={40} onChange={(e) => set("ctaText", e.target.value)} />
            </Field>
            <Field label="Estilo do topo">
              <Select value={c.heroStyle} onChange={(e) => set("heroStyle", e.target.value as LandingConfig["heroStyle"])}>
                <option value="color">Claro com a cor da marca</option>
                <option value="dark">Escuro com a cor da marca</option>
                <option value="image">Imagem de fundo (banner)</option>
              </Select>
            </Field>
          </div>
          {c.heroStyle === "image" && (
            <Field label="Imagem de fundo (link)" hint="Foto horizontal, de preferência 1600 x 900">
              <Input value={brand.bannerUrl} onChange={(e) => setBrand({ ...brand, bannerUrl: e.target.value })} placeholder="https://" />
            </Field>
          )}
        </Block>

        <Block title="Marca" description="Logo, cor e WhatsApp">
          <Field label="Logo (link da imagem)">
            <Input value={brand.logoUrl} onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="Cor da marca">
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setBrand({ ...brand, primaryColor: col })}
                  className="size-9 rounded-full ring-2 ring-offset-2 transition"
                  style={{ background: col, ["--tw-ring-color" as string]: brand.primaryColor === col ? col : "transparent" }}
                  aria-label={col}
                />
              ))}
              <input type="color" value={brand.primaryColor} onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })} className="size-9 cursor-pointer rounded-full border-0 bg-transparent" />
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="WhatsApp">
              <Input value={brand.whatsapp} onChange={(e) => setBrand({ ...brand, whatsapp: e.target.value })} inputMode="tel" placeholder="(11) 99999-9999" />
            </Field>
            <Field label="Instagram">
              <Input value={c.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@sualoja" />
            </Field>
            <Field label="E-mail público">
              <Input value={c.publicEmail} onChange={(e) => set("publicEmail", e.target.value)} type="email" />
            </Field>
          </div>
        </Block>

        <Block title="Números em destaque" description="Até 4 números de impacto" {...sec("stats")}>
          <p className="text-xs text-zinc-500">
            Dica: escreva <code className="rounded bg-zinc-100 px-1">{"{produtos}"}</code> para mostrar automaticamente quantos produtos você tem.
          </p>
          <ListEditor
            items={c.stats}
            onChange={(v) => set("stats", v)}
            max={4}
            empty={{ value: "", label: "" }}
            addLabel="Adicionar número"
            render={(it, upd) => (
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <Input value={it.value} onChange={(e) => upd({ ...it, value: e.target.value })} placeholder="24h" />
                <Input value={it.label} onChange={(e) => upd({ ...it, label: e.target.value })} placeholder="para postagem" />
              </div>
            )}
          />
        </Block>

        <Block title="O que fornecemos" description="Texto e categorias" {...sec("supply")}>
          <Field label="Título">
            <Input value={c.supplyTitle} onChange={(e) => set("supplyTitle", e.target.value)} />
          </Field>
          <Field label="Texto">
            <Textarea value={c.supplyText} onChange={(e) => set("supplyText", e.target.value)} className="min-h-24" />
          </Field>
          <Switch checked={c.showCategories} onChange={(v) => set("showCategories", v)} label="Mostrar categorias do catálogo" />
        </Block>

        <Block title="Prévia de produtos" description="Vitrine automática do seu catálogo" {...sec("products")}>
          <Field label="Título">
            <Input value={c.productsTitle} onChange={(e) => set("productsTitle", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quais produtos mostrar">
              <Select value={c.productsSource} onChange={(e) => set("productsSource", e.target.value as LandingConfig["productsSource"])}>
                <option value="featured">Destaques</option>
                <option value="new">Mais novos</option>
                <option value="best">Mais vendidos</option>
              </Select>
            </Field>
            <Field label="Quantidade">
              <Select value={c.productsCount} onChange={(e) => set("productsCount", Number(e.target.value))}>
                {[4, 8, 12, 16].map((n) => (
                  <option key={n} value={n}>
                    {n} produtos
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="text-xs text-zinc-500">Os preços de revenda só aparecem se estiver ligado em Configurações, Vitrine e marca.</p>
        </Block>

        <Block title="Vantagens" description="Por que revender com você" {...sec("benefits")}>
          <ListEditor
            items={c.benefits}
            onChange={(v) => set("benefits", v)}
            max={6}
            empty={{ title: "", text: "" }}
            addLabel="Adicionar vantagem"
            render={(it, upd) => (
              <>
                <Input value={it.title} onChange={(e) => upd({ ...it, title: e.target.value })} placeholder="Título" />
                <Textarea value={it.text} onChange={(e) => upd({ ...it, text: e.target.value })} placeholder="Descrição curta" className="min-h-16" />
              </>
            )}
          />
        </Block>

        <Block title="Como funciona" description="Passo a passo" {...sec("steps")}>
          <ListEditor
            items={c.steps}
            onChange={(v) => set("steps", v)}
            max={6}
            empty={{ title: "", text: "" }}
            addLabel="Adicionar passo"
            render={(it, upd) => (
              <>
                <Input value={it.title} onChange={(e) => upd({ ...it, title: e.target.value })} placeholder="Título do passo" />
                <Input value={it.text} onChange={(e) => upd({ ...it, text: e.target.value })} placeholder="Explicação" />
              </>
            )}
          />
        </Block>

        <Block title="Regras da parceria" description="Combinados com o revendedor" {...sec("rules")}>
          <Switch
            checked={c.showAutoRules}
            onChange={(v) => set("showAutoRules", v)}
            label="Incluir regras automáticas"
            description="Geradas das suas configurações (taxa, prazo, etiqueta, aprovação)"
          />
          {c.showAutoRules && (
            <ul className="grid gap-1 rounded-xl bg-zinc-50 p-3 text-[13px] text-zinc-600 ring-1 ring-zinc-100">
              {autoRules.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          )}
          <ListEditor
            items={c.rules}
            onChange={(v) => set("rules", v)}
            max={12}
            empty=""
            addLabel="Adicionar regra"
            render={(it, upd) => <Input value={it} onChange={(e) => upd(e.target.value)} placeholder="Ex: pedido mínimo de 1 unidade" />}
          />
        </Block>

        <Block title="Depoimentos" description="Prova social de revendedores" {...sec("testimonials")}>
          <ListEditor
            items={c.testimonials}
            onChange={(v) => set("testimonials", v)}
            max={6}
            empty={{ name: "", role: "", text: "" }}
            addLabel="Adicionar depoimento"
            render={(it, upd) => (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={it.name} onChange={(e) => upd({ ...it, name: e.target.value })} placeholder="Nome" />
                  <Input value={it.role} onChange={(e) => upd({ ...it, role: e.target.value })} placeholder="Ex: Revendedora na Shopee" />
                </div>
                <Textarea value={it.text} onChange={(e) => upd({ ...it, text: e.target.value })} placeholder="Depoimento" className="min-h-16" />
              </>
            )}
          />
        </Block>

        <Block title="Perguntas frequentes" description="Tire as dúvidas antes do cadastro" {...sec("faq")}>
          <ListEditor
            items={c.faq}
            onChange={(v) => set("faq", v)}
            max={12}
            empty={{ q: "", a: "" }}
            addLabel="Adicionar pergunta"
            render={(it, upd) => (
              <>
                <Input value={it.q} onChange={(e) => upd({ ...it, q: e.target.value })} placeholder="Pergunta" />
                <Textarea value={it.a} onChange={(e) => upd({ ...it, a: e.target.value })} placeholder="Resposta" className="min-h-16" />
              </>
            )}
          />
        </Block>

        <Block title="Chamada do cadastro" description="Texto ao lado do formulário">
          <Field label="Título">
            <Input value={c.signupTitle} onChange={(e) => set("signupTitle", e.target.value)} />
          </Field>
          <Field label="Texto">
            <Textarea value={c.signupText} onChange={(e) => set("signupText", e.target.value)} className="min-h-16" />
          </Field>
        </Block>

        <button
          type="button"
          onClick={() => confirm("Voltar todos os textos da página para o padrão?") && exec(() => resetLanding(), { onSuccess: () => location.reload() })}
          className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-zinc-500 hover:text-zinc-900"
        >
          <RotateCcw className="size-4" /> Restaurar textos padrão
        </button>
      </div>

      {/* Previa */}
      <div className="hidden xl:block">
        <div className="sticky top-24">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Prévia</p>
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5">
              <button type="button" onClick={() => setDevice("mobile")} className={cn("rounded-md p-1.5", device === "mobile" ? "bg-white shadow-sm" : "text-zinc-500")} aria-label="Celular">
                <Smartphone className="size-4" />
              </button>
              <button type="button" onClick={() => setDevice("desktop")} className={cn("rounded-md p-1.5", device === "desktop" ? "bg-white shadow-sm" : "text-zinc-500")} aria-label="Computador">
                <Monitor className="size-4" />
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-zinc-200" style={{ height: "calc(100dvh - 12rem)" }}>
            {device === "mobile" ? (
              <iframe key={previewKey} src={previewPath} title="Prévia da página" className="mx-auto h-full w-[390px] max-w-full border-0" />
            ) : (
              <div className="h-full w-full overflow-hidden">
                <iframe
                  key={previewKey}
                  src={previewPath}
                  title="Prévia da página"
                  className="origin-top-left border-0"
                  style={{ width: 1280, height: "calc((100dvh - 12rem) / 0.359)", transform: "scale(0.359)" }}
                />
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-500">A prévia atualiza quando você publica.</p>
        </div>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur lg:bottom-0 lg:left-[264px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <p className="hidden text-sm text-zinc-500 sm:block">As mudanças só aparecem para os visitantes depois de publicar.</p>
          <div className="flex w-full gap-2 sm:w-auto">
            <a href={landingUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-medium ring-1 ring-zinc-200 sm:flex-none">
              <ExternalLink className="size-4" /> Ver página
            </a>
            <Button onClick={save} loading={pending} className="flex-1 sm:flex-none">
              Publicar alterações
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
