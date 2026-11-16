"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ExternalLink, PencilLine, Rocket, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { convertImport, deleteImports, setImportStatus } from "@/actions/imports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { SmartImg } from "@/components/ui/smart-img";
import { useAction } from "@/components/ui/use-action";
import { brl, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ImportView = {
  id: string;
  source: string;
  sourceLabel: string;
  sourceUrl: string;
  title: string;
  description: string;
  price: number | null;
  images: string[];
  attributes: { name: string; value: string }[];
  variations: { name: string; values: string[] }[];
  status: "PENDING" | "CONVERTED" | "DISCARDED";
  productId: string | null;
  createdAt: string;
};

const TONE: Record<string, "amber" | "orange" | "zinc" | "red" | "blue"> = {
  MERCADO_LIVRE: "amber",
  SHOPEE: "orange",
  TIKTOK: "zinc",
  TEMU: "red",
  OUTRO: "blue",
};

export function ImportCard({ item, categories }: { item: ImportView; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const { exec, pending } = useAction();
  const [price, setPrice] = useState(item.price ?? 0);
  const [stock, setStock] = useState(10);
  const [categoryId, setCategoryId] = useState("");
  const [details, setDetails] = useState(false);
  const combos = item.variations.reduce((n, v) => n * Math.max(1, v.values.length), item.variations.length ? 1 : 0);

  function convert(publish: boolean) {
    if (!price) return toast.error("Informe o preço para o revendedor");
    exec(() => convertImport(item.id, { price, stock, categoryId: categoryId || null, publish }), {
      silent: true,
      onSuccess: (d) => {
        if (!d) return;
        if (d.published) toast.success("Produto cadastrado e liberado para os revendedores");
        else router.push(`/f/produtos/${d.productId}`);
      },
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/70">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TONE[item.source] ?? "zinc"}>{item.sourceLabel}</Badge>
            {item.status === "CONVERTED" && <Badge tone="emerald">Cadastrado</Badge>}
            {item.status === "DISCARDED" && <Badge>Descartado</Badge>}
            <span className="text-xs text-zinc-400">importado {timeAgo(item.createdAt)}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-[15px] leading-snug font-semibold">{item.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            {item.price ? <span>Preço no anúncio: <b className="text-zinc-800">{brl(item.price)}</b></span> : <span>Preço não encontrado</span>}
            <span>{item.images.length} fotos</span>
            {item.attributes.length > 0 && <span>{item.attributes.length} características</span>}
            {combos > 0 && <span>{combos} variações</span>}
            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
              Ver anúncio <ExternalLink className="size-3" />
            </a>
          </div>

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {item.images.map((src, i) => (
              <a key={src} href={src} target="_blank" rel="noreferrer" className="size-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200 sm:size-24">
                <SmartImg src={src} alt={`Foto ${i + 1}`} size={96} className="size-full object-cover" />
              </a>
            ))}
          </div>

          {item.variations.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {item.variations.map((v) => (
                <div key={v.name} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-semibold text-zinc-700">{v.name}:</span>
                  {v.values.slice(0, 14).map((x) => (
                    <span key={x} className="rounded-lg bg-zinc-100 px-2 py-0.5 text-zinc-700">
                      {x}
                    </span>
                  ))}
                  {v.values.length > 14 && <span className="text-zinc-400">+{v.values.length - 14}</span>}
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => setDetails(!details)} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-zinc-500 hover:text-zinc-900">
            <ChevronDown className={cn("size-4 transition", details && "rotate-180")} /> {details ? "Ocultar" : "Ver"} descrição e características
          </button>
          {details && (
            <div className="mt-2 grid gap-3 rounded-xl bg-zinc-50 p-3 text-[13px] ring-1 ring-zinc-100">
              <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-zinc-700">{item.description || "Sem descrição encontrada."}</p>
              {item.attributes.length > 0 && (
                <div className="grid gap-1 sm:grid-cols-2">
                  {item.attributes.map((a) => (
                    <div key={a.name} className="flex gap-2">
                      <span className="text-zinc-500">{a.name}:</span>
                      <span className="font-medium">{a.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
          {item.status === "CONVERTED" ? (
            <div className="flex h-full flex-col justify-center gap-3 text-sm">
              <p className="text-zinc-600">Este anúncio já virou um produto do seu catálogo.</p>
              {item.productId && (
                <Link href={`/f/produtos/${item.productId}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white font-medium ring-1 ring-zinc-200 hover:bg-zinc-100">
                  <PencilLine className="size-4" /> Abrir produto
                </Link>
              )}
            </div>
          ) : item.status === "DISCARDED" ? (
            <div className="flex h-full flex-col justify-center gap-2">
              <Button variant="secondary" loading={pending} onClick={() => exec(() => setImportStatus([item.id], "PENDING"))}>
                <Undo2 /> Restaurar
              </Button>
              <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => confirm("Remover definitivamente?") && exec(() => deleteImports([item.id]))}>
                <Trash2 /> Remover
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <Field label="Preço para o revendedor" hint={item.price ? "Sugestão: preço do anúncio. Ajuste para o seu preço de revenda." : undefined}>
                <MoneyInput value={price} onChange={setPrice} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={combos > 0 ? "Estoque por variação" : "Estoque"}>
                  <Input type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(Math.max(0, parseInt(e.target.value || "0", 10)))} />
                </Field>
                <Field label="Categoria">
                  <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Nenhuma</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button loading={pending} onClick={() => convert(true)} className="w-full">
                <Rocket /> Cadastrar e liberar
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" disabled={pending} onClick={() => convert(false)}>
                  <PencilLine /> Editar antes
                </Button>
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => exec(() => setImportStatus([item.id], "DISCARDED"))}>
                  <Trash2 /> Descartar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
