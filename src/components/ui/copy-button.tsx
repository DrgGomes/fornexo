"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export function CopyButton({
  text,
  label = "Copiar",
  toastMsg = "Copiado",
  className,
  compact,
}: {
  text: string;
  label?: string;
  toastMsg?: string;
  className?: string;
  compact?: boolean;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await copyText(text);
        setDone(true);
        toast.success(toastMsg);
        setTimeout(() => setDone(false), 1400);
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition active:scale-95",
        compact ? "size-8 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" : "h-8 bg-zinc-900 px-3 text-[13px] text-white hover:bg-zinc-800",
        done && !compact && "bg-emerald-600 hover:bg-emerald-600",
        done && compact && "text-emerald-600",
        className,
      )}
      aria-label={label}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {!compact && (done ? "Copiado" : label)}
    </button>
  );
}
