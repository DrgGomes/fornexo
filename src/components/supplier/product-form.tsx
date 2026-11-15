"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { saveProduct, type ProductPayload } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea, fieldBase } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/components/ui/use-action";
import { parseImageList } from "@/lib/images";
import { brl, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type VariantRow = ProductPayload["variants"][number] & { key: string };
type OptionDef = { name: string; values: string[] };

export type ProductFormInitial = Omit<ProductPayload, "variants" | "newCategory"> & { variants: ProductPayload["variants"] };

const blank: ProductFormInitial = {
  name: "",
  sku: "",
  brand: "",
  categoryId: null,
  titleShopee: "",
  titleMl: "",
  description: "",
  images: [],
  videoUrl: "",
  price: 0,
  suggestedPrice: null,
  costPrice: null,
  weightGrams: null,
  heightCm: null,
  widthCm: null,
  lengthCm: null,
  ean: "",
  ncm: "",
  tags: [],
  status: "ACTIVE",
  featured: false,
  lowStockAlert: 5,
  hasVariants: false,
  optionNames: [],
  variants: [{ name: "Único", sku: "", options: [], price: null, stock: 0, imageUrl: null, ean: null }],
};

let keySeq = 0;
const k = () => `v${++keySeq}`;

function abbr(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

function numOrNull(v: string) {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function ValuesInput({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...values, ...parts.filter((p) => !values.includes(p))]);
    setText("");
  };
  return (
    <div className={cn(fieldBase, "flex min-h-11 flex-wrap items-center gap-1.5 py-1.5")}>
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 py-1 pr-1 pl-2 text-[13px] font-medium">
          {v}
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="rounded p-0.5 text-zinc-400 hover:text-zinc-800">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => {
          if (e.target.value.endsWith(",")) add(e.target.value);
          else setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(text);
          } else if (e.key === "Backspace" && !text && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={() => add(text)}
        placeholder={values.length ? "" : "Digite e pressione Enter"}
        className="min-w-24 flex-1 bg-transparent py-1 text-sm outline-none"
      />
    </div>
  );
}

export function ProductForm({
  initial,
  categories,
  isNew,
}: {
  initial?: ProductFormInitial & { id?: string };
  categories: { id: string; name: string }[];
  isNew: boolean;
}) {
  const router = useRouter();
  const { exec, pending } = useAction();
  const init = initial ?? blank;
  const [p, setP] = useState(() => ({ ...init }));
  const [rows, setRows] = useState<VariantRow[]>(() => init.variants.map((v) => ({ ...v, key: k() })));
  const [options, setOptions] = useState<OptionDef[]>(() =>
    init.hasVariants
      ? init.optionNames.map((name, i) => ({ name, values: [...new Set(init.variants.map((v) => v.options[i]).filter(Boolean))] }))
      : [{ name: "Cor", values: [] }],
  );
  const [newCategory, setNewCategory] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [imgText, setImgText] = useState("");
  const [tagsText, setTagsText] = useState(init.tags.join(", "));

  const set = <K extends keyof typeof p>(key: K, value: (typeof p)[K]) => setP((s) => ({ ...s, [key]: value }));

  const margin = useMemo(() => {
    if (!p.costPrice || !p.price) return null;
    return ((p.price - p.costPrice) / p.price) * 100;
  }, [p.price, p.costPrice]);

  function addImages() {
    const list = parseImageList(imgText);
    if (!list.length) return toast.error("Cole links começando com http:// ou https://");
    set("images", [...p.images, ...list.filter((u) => !p.images.includes(u))].slice(0, 30));
    setImgText("");
  }

  function moveImage(i: number, dir: -1 | 1) {
    const arr = [...p.images];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("images", arr);
  }

  function generateVariants() {
    const opts = options.filter((o) => o.name.trim() && o.values.length);
    if (!opts.length) return toast.error("Defina ao menos uma opção com valores");
    const combos = opts.reduce<string[][]>((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]);
    const byKey = new Map(rows.filter((r) => r.options.length).map((r) => [r.options.join("|"), r]));
    const next = combos.map((c) => {
      const prev = byKey.get(c.join("|"));
      return (
        prev ?? {
          key: k(),
          name: c.join(" / "),
          sku: `${p.sku || "SKU"}-${c.map(abbr).join("-")}`,
          options: c,
          price: null,
          stock: 0,
          imageUrl: null,
          ean: null,
        }
      );
    });
    setRows(next);
    set("optionNames", opts.map((o) => o.name.trim()));
    toast.success(`${next.length} variações geradas`);
  }

  function updateRow(key: string, patch: Partial<VariantRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function submit() {
    if (!p.name.trim()) return toast.error("Informe o nome do produto");
    if (!p.sku.trim()) return toast.error("Informe o SKU");
    if (!p.price) return toast.error("Informe o preço para o revendedor");
    if (p.hasVariants && rows.filter((r) => r.options.length).length === 0) return toast.error("Gere as variações antes de salvar");
    const variants = p.hasVariants
      ? rows.filter((r) => r.options.length)
      : [{ ...(rows.find((r) => !r.options.length) ?? rows[0]), name: "Único", sku: p.sku, options: [] }];
    const payload: ProductPayload = {
      ...p,
      id: initial?.id,
      newCategory: creatingCat && newCategory.trim() ? newCategory.trim() : undefined,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      optionNames: p.hasVariants ? options.filter((o) => o.name.trim() && o.values.length).map((o) => o.name.trim()) : [],
      variants: variants.map(({ key: _k, ...v }) => ({ ...v, stock: Number(v.stock) || 0 })),
    };
    exec(() => saveProduct(payload), {
      onSuccess: (d) => {
        if (isNew && d) router.replace(`/f/produtos/${d.id}`);
      },
    });
  }

  const simpleRow = rows.find((r) => !r.options.length) ?? rows[0];
  const totalStock = p.hasVariants ? rows.filter((r) => r.options.length).reduce((s, r) => s + (Number(r.stock) || 0), 0) : Number(simpleRow?.stock) || 0;

  return (
    <div className="pb-24">
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader title="Informações básicas" />
            <CardBody className="grid gap-4">
              <Field label="Nome do produto" aside={`${p.name.length} caracteres`}>
                <Input value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Fone Bluetooth TWS Pro" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SKU principal" hint="Código interno do produto">
                  <Input value={p.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} placeholder="FON-TWS-001" className="font-mono" />
                </Field>
                <Field label="Marca">
                  <Input value={p.brand ?? ""} onChange={(e) => set("brand", e.target.value)} />
                </Field>
              </div>
              <Field label="Categoria">
                {creatingCat ? (
                  <div className="flex gap-2">
                    <Input autoFocus value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nome da nova categoria" />
                    <Button variant="secondary" onClick={() => setCreatingCat(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={p.categoryId ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__new") setCreatingCat(true);
                      else set("categoryId", e.target.value || null);
                    }}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__new">+ Nova categoria</option>
                  </Select>
                )}
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fotos" description="Cole links das imagens. A primeira é a capa. Links do Google Drive e Dropbox são convertidos automaticamente." />
            <CardBody>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  value={imgText}
                  onChange={(e) => setImgText(e.target.value)}
                  placeholder={"https://site.com/foto1.jpg\nhttps://site.com/foto2.jpg"}
                  className="min-h-20 font-mono text-xs sm:text-xs"
                />
                <Button variant="dark" onClick={addImages} className="sm:h-auto">
                  <ImagePlus /> Adicionar
                </Button>
              </div>
              {p.images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {p.images.map((src, i) => (
                    <div key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="size-full object-cover" />
                      {i === 0 && <span className="absolute top-1.5 left-1.5 rounded-md bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">Capa</span>}
                      <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => moveImage(i, -1)} className="rounded-md bg-white/90 p-1 text-zinc-800" aria-label="Mover para esquerda">
                            <ArrowLeft className="size-3.5" />
                          </button>
                          <button type="button" onClick={() => moveImage(i, 1)} className="rounded-md bg-white/90 p-1 text-zinc-800" aria-label="Mover para direita">
                            <ArrowRight className="size-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => set("images", p.images.filter((x) => x !== src))}
                          className="rounded-md bg-white/90 p-1 text-red-600"
                          aria-label="Remover"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Field label="Link de vídeo (opcional)" className="mt-4">
                <Input value={p.videoUrl ?? ""} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://" />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Títulos e descrição" description="O revendedor copia com um toque. Capriche nas palavras-chave." />
            <CardBody className="grid gap-4">
              <Field
                label="Título para Shopee"
                aside={<span className={(p.titleShopee?.length ?? 0) > 120 ? "text-red-500" : ""}>{p.titleShopee?.length ?? 0}/120</span>}
              >
                <div className="flex gap-2">
                  <Input value={p.titleShopee ?? ""} onChange={(e) => set("titleShopee", e.target.value)} />
                  <Button variant="secondary" size="icon" title="Usar nome do produto" onClick={() => set("titleShopee", p.name.slice(0, 120))}>
                    <Wand2 />
                  </Button>
                </div>
              </Field>
              <Field
                label="Título para Mercado Livre"
                aside={<span className={(p.titleMl?.length ?? 0) > 60 ? "text-red-500" : ""}>{p.titleMl?.length ?? 0}/60</span>}
              >
                <div className="flex gap-2">
                  <Input value={p.titleMl ?? ""} onChange={(e) => set("titleMl", e.target.value)} />
                  <Button variant="secondary" size="icon" title="Usar nome do produto" onClick={() => set("titleMl", p.name.slice(0, 60))}>
                    <Wand2 />
                  </Button>
                </div>
              </Field>
              <Field label="Descrição" aside={`${p.description.length} caracteres`}>
                <Textarea
                  value={p.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="min-h-56"
                  placeholder={"Descrição completa do produto.\n\nCaracterísticas:\n- ...\n\nItens inclusos:\n- ..."}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Variações e estoque"
              description={p.hasVariants ? `${rows.filter((r) => r.options.length).length} variações · ${totalStock} unidades` : `${totalStock} unidades`}
            />
            <CardBody className="grid gap-4">
              <Switch
                checked={p.hasVariants}
                onChange={(v) => set("hasVariants", v)}
                label="Este produto tem variações"
                description="Cor, tamanho, voltagem, modelo..."
              />

              {!p.hasVariants ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Estoque disponível">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={simpleRow?.stock ?? 0}
                      onChange={(e) => simpleRow && updateRow(simpleRow.key, { stock: parseInt(e.target.value || "0", 10) })}
                    />
                  </Field>
                  <Field label="EAN / código de barras">
                    <Input value={p.ean ?? ""} onChange={(e) => set("ean", e.target.value)} inputMode="numeric" />
                  </Field>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
                    {options.map((o, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                        <Input
                          value={o.name}
                          onChange={(e) => setOptions((os) => os.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                          placeholder="Opção (ex: Cor)"
                        />
                        <ValuesInput values={o.values} onChange={(vals) => setOptions((os) => os.map((x, j) => (j === i ? { ...x, values: vals } : x)))} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setOptions((os) => os.filter((_, j) => j !== i))}
                          disabled={options.length === 1}
                          aria-label="Remover opção"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      {options.length < 3 && (
                        <Button variant="secondary" size="sm" onClick={() => setOptions((os) => [...os, { name: os.length === 1 ? "Tamanho" : "Modelo", values: [] }])}>
                          <Plus /> Adicionar opção
                        </Button>
                      )}
                      <Button size="sm" variant="dark" onClick={generateVariants}>
                        <Sparkles /> Gerar variações
                      </Button>
                    </div>
                  </div>

                  {rows.filter((r) => r.options.length).length > 0 && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const v = prompt("Estoque para todas as variações:");
                            if (v === null) return;
                            const n = parseInt(v, 10);
                            if (Number.isFinite(n)) setRows((rs) => rs.map((r) => ({ ...r, stock: n })));
                          }}
                        >
                          Mesmo estoque para todas
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setRows((rs) => rs.map((r) => (r.options.length ? { ...r, sku: `${p.sku || "SKU"}-${r.options.map(abbr).join("-")}` } : r)))}
                        >
                          Recriar SKUs
                        </Button>
                      </div>
                      <div className="-mx-5 overflow-x-auto">
                        <table className="w-full min-w-[640px] text-sm">
                          <thead>
                            <tr className="border-y border-zinc-100 text-left text-xs text-zinc-500">
                              <th className="px-5 py-2 font-medium">Variação</th>
                              <th className="px-2 py-2 font-medium">SKU</th>
                              <th className="px-2 py-2 font-medium">Preço (opcional)</th>
                              <th className="px-2 py-2 font-medium">Estoque</th>
                              <th className="px-2 py-2 font-medium">Foto</th>
                              <th className="px-5 py-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {rows
                              .filter((r) => r.options.length)
                              .map((r) => (
                                <tr key={r.key}>
                                  <td className="px-5 py-2 font-medium whitespace-nowrap">{r.name}</td>
                                  <td className="px-2 py-2">
                                    <Input value={r.sku} onChange={(e) => updateRow(r.key, { sku: e.target.value.toUpperCase() })} className="h-9 font-mono text-xs sm:h-9" />
                                  </td>
                                  <td className="w-36 px-2 py-2">
                                    <MoneyInput value={r.price ?? 0} onChange={(c) => updateRow(r.key, { price: c || null })} placeholder={brl(p.price).replace("R$", "").trim()} />
                                  </td>
                                  <td className="w-24 px-2 py-2">
                                    <Input
                                      type="number"
                                      inputMode="numeric"
                                      value={r.stock}
                                      onChange={(e) => updateRow(r.key, { stock: parseInt(e.target.value || "0", 10) })}
                                      className="h-9 sm:h-9"
                                    />
                                  </td>
                                  <td className="w-32 px-2 py-2">
                                    <Select value={r.imageUrl ?? ""} onChange={(e) => updateRow(r.key, { imageUrl: e.target.value || null })} className="h-9 text-xs sm:h-9">
                                      <option value="">Capa</option>
                                      {p.images.map((src, i) => (
                                        <option key={src} value={src}>
                                          Foto {i + 1}
                                        </option>
                                      ))}
                                    </Select>
                                  </td>
                                  <td className="px-5 py-2">
                                    <button
                                      type="button"
                                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                      aria-label="Remover variação"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </>
              )}
              <Field label="Alerta de estoque baixo" hint="Avisar quando o estoque de uma variação chegar neste número">
                <Input type="number" inputMode="numeric" value={p.lowStockAlert} onChange={(e) => set("lowStockAlert", parseInt(e.target.value || "0", 10))} className="sm:max-w-40" />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Logística e fiscal" description="Ajuda o revendedor a preencher o anúncio e calcular frete." />
            <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Peso (g)">
                <Input inputMode="numeric" value={p.weightGrams ?? ""} onChange={(e) => set("weightGrams", e.target.value ? parseInt(e.target.value, 10) || null : null)} />
              </Field>
              <Field label="Altura (cm)">
                <Input inputMode="decimal" value={p.heightCm ?? ""} onChange={(e) => set("heightCm", numOrNull(e.target.value))} />
              </Field>
              <Field label="Largura (cm)">
                <Input inputMode="decimal" value={p.widthCm ?? ""} onChange={(e) => set("widthCm", numOrNull(e.target.value))} />
              </Field>
              <Field label="Comprimento (cm)">
                <Input inputMode="decimal" value={p.lengthCm ?? ""} onChange={(e) => set("lengthCm", numOrNull(e.target.value))} />
              </Field>
              <Field label="NCM" className="col-span-2">
                <Input value={p.ncm ?? ""} onChange={(e) => set("ncm", e.target.value)} inputMode="numeric" />
              </Field>
              <Field label="Tags (separadas por vírgula)" className="col-span-2">
                <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="verão, presente, lançamento" />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader title="Preços" />
            <CardBody className="grid gap-4">
              <Field label="Preço para o revendedor" hint="Valor que o revendedor paga por unidade">
                <MoneyInput value={p.price} onChange={(c) => set("price", c)} />
              </Field>
              <Field label="Preço de venda sugerido" hint="Referência para o anúncio">
                <MoneyInput value={p.suggestedPrice ?? 0} onChange={(c) => set("suggestedPrice", c || null)} />
              </Field>
              <Field label="Seu custo (privado)" hint="Só você vê. Usado para calcular seu lucro.">
                <MoneyInput value={p.costPrice ?? 0} onChange={(c) => set("costPrice", c || null)} />
              </Field>
              {margin !== null && (
                <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-3.5 py-3 text-sm ring-1 ring-zinc-100">
                  <span className="text-zinc-500">Sua margem</span>
                  <span className={cn("font-semibold", margin < 0 ? "text-red-600" : "text-emerald-600")}>
                    {pct(margin)} · {brl(p.price - (p.costPrice ?? 0))}
                  </span>
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Publicação" />
            <CardBody className="grid gap-4">
              <Field label="Status">
                <Select value={p.status} onChange={(e) => set("status", e.target.value as typeof p.status)}>
                  <option value="ACTIVE">Ativo (visível para revendedores)</option>
                  <option value="DRAFT">Rascunho (oculto)</option>
                  <option value="ARCHIVED">Arquivado</option>
                </Select>
              </Field>
              <Switch checked={p.featured} onChange={(v) => set("featured", v)} label="Destaque" description="Aparece primeiro na vitrine e no catálogo" />
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur lg:bottom-0 lg:left-[264px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <p className="hidden text-sm text-zinc-500 sm:block">{isNew ? "Novo produto" : "Alterações não salvas são perdidas ao sair"}</p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="secondary" onClick={() => router.push("/f/produtos")} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button onClick={submit} loading={pending} className="flex-1 sm:flex-none">
              Salvar produto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
