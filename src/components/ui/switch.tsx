"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  description,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", className)}>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-zinc-900">{label}</span>}
          {description && <span className="mt-0.5 block text-[13px] text-zinc-500">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition", checked ? "bg-brand" : "bg-zinc-200")}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition", checked ? "translate-x-5.5" : "translate-x-0.5")} />
      </button>
    </label>
  );
}
