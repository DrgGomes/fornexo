"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function CatalogFilters({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete("page");
    return `${pathname}?${p.toString()}`;
  };
  const cat = params.get("cat");
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex gap-2">
        <SearchInput placeholder="Buscar produtos" className="flex-1" />
        <Select value={params.get("sort") ?? ""} onChange={(e) => router.replace(href({ sort: e.target.value || null }), { scroll: false })} className="w-36 shrink-0 sm:w-44">
          <option value="">Destaques</option>
          <option value="novos">Mais novos</option>
          <option value="vendidos">Mais vendidos</option>
          <option value="menor">Menor preço</option>
          <option value="maior">Maior preço</option>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <div className="no-scrollbar -mx-4 flex flex-1 gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Link href={href({ cat: null })} scroll={false} className={cn("inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-medium", !cat ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200")}>
            Tudo
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={href({ cat: c.id })}
              scroll={false}
              className={cn("inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-medium", cat === c.id ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200")}
            >
              {c.name}
            </Link>
          ))}
        </div>
        <div className="hidden shrink-0 sm:block">
          <Switch checked={!!params.get("estoque")} onChange={(v) => router.replace(href({ estoque: v ? "1" : null }), { scroll: false })} label={<span className="text-[13px]">Só com estoque</span>} />
        </div>
      </div>
    </div>
  );
}
