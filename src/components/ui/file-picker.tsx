"use client";

import { useRef } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function FilePicker({
  file,
  onChange,
  label = "Anexar arquivo",
  hint = "PDF ou imagem até 4 MB",
  accept = "application/pdf,image/png,image/jpeg,image/webp",
  className,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  label?: string;
  hint?: string;
  accept?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={className}>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (f && f.size > MAX_UPLOAD_BYTES) {
            toast.error("Arquivo maior que 4 MB");
            e.target.value = "";
            return;
          }
          onChange(f);
        }}
      />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
          <span className="flex size-10 items-center justify-center rounded-lg bg-white text-zinc-500 ring-1 ring-zinc-200">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white hover:text-zinc-700"
            onClick={() => {
              onChange(null);
              if (ref.current) ref.current.value = "";
            }}
            aria-label="Remover"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-left transition hover:border-brand hover:bg-brand/5",
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Paperclip className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-medium text-zinc-900">{label}</span>
            <span className="block text-xs text-zinc-500">{hint}</span>
          </span>
        </button>
      )}
    </div>
  );
}
