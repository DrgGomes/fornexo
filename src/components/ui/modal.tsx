"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-sheet sm:animate-in relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl",
          widths[size],
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-zinc-200 sm:hidden" />
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-2 sm:pt-5">
            <div className="min-w-0">
              {title && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
            </div>
            <button onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Fechar">
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-3">{children}</div>
        {footer && <div className="pb-safe border-t border-zinc-100 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
