"use client";

import { useEffect, useRef, useState } from "react";
import { EllipsisVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropdownItem = { label: string; onClick: () => void; danger?: boolean; icon?: React.ReactNode; disabled?: boolean };

export function Dropdown({ items, trigger, align = "right" }: { items: DropdownItem[]; trigger?: React.ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex size-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        aria-label="Ações"
      >
        {trigger ?? <EllipsisVertical className="size-4" />}
      </button>
      {open && (
        <div
          className={cn(
            "animate-in absolute top-10 z-50 min-w-48 overflow-hidden rounded-xl bg-white p-1 shadow-xl ring-1 ring-zinc-200",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              disabled={it.disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                it.onClick();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm disabled:opacity-40 [&_svg]:size-4",
                it.danger ? "text-red-600 hover:bg-red-50" : "text-zinc-700 hover:bg-zinc-100",
              )}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
