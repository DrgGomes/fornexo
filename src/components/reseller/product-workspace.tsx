"use client";

import Link from "next/link";
import { SmartImg } from "@/components/ui/smart-img";
import { useRef, useState } from "react";
import { Download, FileArchive, MessageCircle, Package, Share2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { OrderProductOption } from "@/actions/reseller";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Modal } from "@/components/ui/modal";
import { downloadZip, safeFileName, shareOrDownloadImages } from "@/lib/download";
import { brl } from "@/lib/format";
import type { FeeProfileInput } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import { OrderForm } from "./order-form";
import { PriceCalculator, type CalcCosts } from "./price-calculator";

export type WorkspaceProduct = {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  category: string | null;
  titleShopee: string | null;
  titleMl: string | null;
  description: string;
  images: string[];
  videoUrl: string | null;
  price: number;
  suggestedPrice: number | null;
  weightGrams: number | null;
  heightCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  ean: string | null;
  ncm: string | null;
  hasVariants: boolean;
  optionNames: string[];
  variants: { id: string; name: string; sku: string; options: string[]; price: number; stock: number; image: string | null; ean: string | null }[];
};

function CopyBlock({ label, text, hint, mono }: { label: string; text: string; hint?: string; mono?: boolean }) {
  if (!text) return null;
  return (
    <div className="rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-500">
          {label}
          {hint && <span className="ml-1.5 font-normal text-zinc-400">{hint}</span>}
        </span>
        <CopyButton text={text} />
      </div>
      <p className={cn("line-clamp-6 text-sm whitespace-pre-wrap text-zinc-800", mono && "font-mono text-[13px]")}>{text}</p>
    </div>
  );
}

export function ProductWorkspace({
  p,
  favorite,
  handlingFee,
  profiles,
  costs,
  requireLabel,
  balance,
  myMarketplaces,
}: {
  p: WorkspaceProduct;
  favorite: boolean;
  handlingFee: number;
  profiles: FeeProfileInput[];
  costs: CalcCosts;
  requireLabel: boolean;
  balance: number;
  myMarketplaces: string[];
}) {
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const base = safeFileName(p.sku || p.name);
  const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);

  const specs = [
    `Produto: ${p.name}`,
    p.brand && `Marca: ${p.brand}`,
    `SKU: ${p.sku}`,
    p.ean && `EAN: ${p.ean}`,
    p.ncm && `NCM: ${p.ncm}`,
    p.weightGrams && `Peso: ${p.weightGrams} g`,
    p.heightCm && p.widthCm && p.lengthCm && `Dimensões (A x L x C): ${p.heightCm} x ${p.widthCm} x ${p.lengthCm} cm`,
    p.hasVariants && p.optionNames.map((n, i) => `${n}: ${[...new Set(p.variants.map((v) => v.options[i]).filter(Boolean))].join(", ")}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  const preset: OrderProductOption = {
    id: p.id,
    name: p.name,
    sku: p.sku,
    image: p.images[0] ?? null,
    price: p.price,
    hasVariants: p.hasVariants,
    variants: p.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, stock: v.stock, price: v.price, image: v.image })),
  };

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
    } catch {
      toast.error("Não foi possível baixar. Verifique o link da imagem com o fornecedor.");
    } finally {
      setBusy(null);
    }
  }

  function goTo(i: number) {
    setActive(i);
    const el = scroller.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Galeria */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/70">
            <div
              ref={scroller}
              className="no-scrollbar flex aspect-square snap-x snap-mandatory overflow-x-auto"
              onScroll={(e) => {
                const el = e.currentTarget;
                setActive(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {(p.images.length ? p.images : [""]).map((src, i) => (
                <div key={i} className="relative size-full shrink-0 snap-center bg-zinc-100">
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <SmartImg src={src} alt={`${p.name} ${i + 1}`} size={560} eager={i === 0} className="size-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            {p.images.length > 0 && (
              <>
                <span className="absolute top-3 left-3 rounded-full bg-zinc-900/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                  {active + 1}/{p.images.length}
                </span>
                <button
                  onClick={() => run(`one-${active}`, () => shareOrDownloadImages([p.images[active]], `${base}-${active + 1}`))}
                  className="absolute top-3 right-3 flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3 text-[13px] font-medium shadow-sm backdrop-blur"
                >
                  <Download className="size-4" /> {busy === `one-${active}` ? "Baixando..." : "Esta foto"}
                </button>
              </>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {p.images.map((src, i) => (
                <button key={src} onClick={() => goTo(i)} className={cn("size-16 shrink-0 overflow-hidden rounded-xl ring-2 transition", i === active ? "ring-brand" : "ring-transparent opacity-70")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <SmartImg src={src} size={64} className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {p.images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" loading={busy === "share"} onClick={() => run("share", () => shareOrDownloadImages(p.images, base))}>
                <Share2 /> Salvar todas
              </Button>
              <Button
                variant="secondary"
                loading={busy === "zip"}
                onClick={() =>
                  run("zip", async () => {
                    await downloadZip(p.images, base);
                    toast.success("ZIP baixado");
                  })
                }
              >
                <FileArchive /> Baixar ZIP
              </Button>
            </div>
          )}
          {p.videoUrl && (
            <a href={p.videoUrl} target="_blank" rel="noreferrer" className="mt-2 block text-center text-[13px] font-medium text-brand hover:underline">
              Ver vídeo do produto
            </a>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {p.category && <Badge>{p.category}</Badge>}
              {totalStock > 0 ? <Badge tone="emerald">{totalStock} em estoque</Badge> : <Badge tone="red">Esgotado</Badge>}
            </div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{p.name}</h1>
            <p className="mt-1 font-mono text-xs text-zinc-500">SKU {p.sku}</p>
            <div className="mt-4 flex items-end gap-4">
              <div>
                <p className="text-xs text-zinc-500">Seu custo</p>
                <p className="text-3xl font-semibold tracking-tight">{brl(p.price)}</p>
              </div>
              {p.suggestedPrice ? (
                <div className="pb-1">
                  <p className="text-xs text-zinc-500">Venda sugerida</p>
                  <p className="text-lg font-semibold text-zinc-600">{brl(p.suggestedPrice)}</p>
                </div>
              ) : null}
            </div>
            <div className="mt-4 hidden gap-2 lg:flex">
              <Button size="lg" onClick={() => setOrderOpen(true)} disabled={totalStock <= 0} className="flex-1">
                <ShoppingBag /> Fazer pedido
              </Button>
              <FavoriteButton productId={p.id} initial={favorite} variant="button" />
              <Link href={`/r/mensagens?produto=${p.id}`} className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium ring-1 ring-zinc-200 hover:bg-zinc-50">
                <MessageCircle className="size-4" /> Dúvida
              </Link>
            </div>
          </div>

          {p.hasVariants && (
            <Card>
              <CardHeader title="Variações" description={p.optionNames.join(" e ")} />
              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {p.variants.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="flex items-center gap-1 font-mono text-xs text-zinc-500">
                        {v.sku}
                        <CopyButton text={v.sku} compact className="size-6" toastMsg="SKU copiado" />
                      </p>
                    </div>
                    <span className="text-sm tabular-nums">{brl(v.price)}</span>
                    <span className={cn("w-16 text-right text-sm font-semibold tabular-nums", v.stock <= 0 ? "text-red-600" : "text-zinc-700")}>{v.stock > 0 ? `${v.stock} un` : "Esgot."}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Material para anunciar" description="Toque em copiar e cole no marketplace" />
            <CardBody className="flex flex-col gap-2.5">
              <CopyBlock label="Título" text={p.name} hint={`${p.name.length} caracteres`} />
              <CopyBlock label="Título Shopee" text={p.titleShopee ?? ""} hint={`${p.titleShopee?.length ?? 0}/120`} />
              <CopyBlock label="Título Mercado Livre" text={p.titleMl ?? ""} hint={`${p.titleMl?.length ?? 0}/60`} />
              <CopyBlock label="Descrição" text={p.description} />
              <CopyBlock label="Ficha técnica" text={specs} mono />
              <CopyButton text={`${p.name}\n\n${p.description}\n\n${specs}`} label="Copiar tudo de uma vez" className="mt-1 h-10 w-full" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Por quanto vender" description="Preço mínimo para atingir sua margem em cada plataforma" />
            <CardBody>
              <PriceCalculator productCost={p.price} handlingFee={handlingFee} profiles={profiles} costs={costs} suggestedPrice={p.suggestedPrice} compact />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Barra fixa mobile */}
      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t border-zinc-200 bg-white/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <div className="flex gap-2">
          <FavoriteButton productId={p.id} initial={favorite} />
          <Link href={`/r/mensagens?produto=${p.id}`} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-zinc-200" aria-label="Falar com fornecedor">
            <MessageCircle className="size-5 text-zinc-600" />
          </Link>
          <Button size="lg" className="flex-1" onClick={() => setOrderOpen(true)} disabled={totalStock <= 0}>
            <Package /> {totalStock > 0 ? "Fazer pedido" : "Sem estoque"}
          </Button>
        </div>
      </div>

      <Modal open={orderOpen} onClose={() => setOrderOpen(false)} title="Novo pedido" description="Vendeu? Preencha e anexe a etiqueta." size="lg">
        <OrderForm preset={preset} requireLabel={requireLabel} handlingFee={handlingFee} balance={balance} myMarketplaces={myMarketplaces} onDone={() => setOrderOpen(false)} />
      </Modal>
    </div>
  );
}
