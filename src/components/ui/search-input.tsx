"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldBase } from "./input";

export function SearchInput({ placeholder = "Buscar", param = "q", className }: { placeholder?: string; param?: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(params.get(param) ?? "");
  }, [params, param]);

  function push(v: string) {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(param, v);
    else next.delete(param);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
      <input
        className={cn(fieldBase, "h-11 pr-9 pl-10 sm:h-10")}
        placeholder={placeholder}
        value={value}
        enterKeyHint="search"
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => push(v.trim()), 350);
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            push("");
          }}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-700"
          aria-label="Limpar"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
