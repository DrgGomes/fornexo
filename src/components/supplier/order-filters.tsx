"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { MARKETPLACES } from "@/lib/constants";

export function OrderFilters({ resellers }: { resellers?: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    p.delete("page");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const any = ["rid", "mkt", "from", "to"].some((k) => params.get(k));
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {resellers && (
        <Select value={params.get("rid") ?? ""} onChange={(e) => set("rid", e.target.value)} className="w-44 shrink-0">
          <option value="">Todos revendedores</option>
          {resellers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      )}
      <Select value={params.get("mkt") ?? ""} onChange={(e) => set("mkt", e.target.value)} className="w-40 shrink-0">
        <option value="">Marketplaces</option>
        {MARKETPLACES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </Select>
      <Input type="date" value={params.get("from") ?? ""} onChange={(e) => set("from", e.target.value)} className="w-40 shrink-0" aria-label="De" />
      <Input type="date" value={params.get("to") ?? ""} onChange={(e) => set("to", e.target.value)} className="w-40 shrink-0" aria-label="Até" />
      {any && (
        <button
          type="button"
          onClick={() => {
            const p = new URLSearchParams(params.toString());
            ["rid", "mkt", "from", "to", "page"].forEach((k) => p.delete(k));
            router.replace(`${pathname}?${p.toString()}`);
          }}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-sm text-zinc-500 hover:bg-zinc-100"
        >
          <X className="size-4" /> Limpar
        </button>
      )}
    </div>
  );
}
