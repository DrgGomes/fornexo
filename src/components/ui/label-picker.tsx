"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileText, Info, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { MAX_LABEL_FILES, MAX_LABELS_TOTAL_BYTES, MAX_UPLOAD_BYTES, MERGE_PDF_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function LabelPicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [tooMany, setTooMany] = useState(false);
  const total = files.reduce((s, f) => s + f.size, 0);
  const full = files.length >= MAX_LABEL_FILES;

  function pick(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const ok = incoming.filter((f) => {
      if (f.size > MAX_UPLOAD_BYTES) {
        toast.error(`${f.name} tem mais de 4 MB`);
        return false;
      }
      return true;
    });
    const room = MAX_LABEL_FILES - files.length;
    if (ok.length > room) {
      setTooMany(true);
      toast.error(`Máximo de ${MAX_LABEL_FILES} etiquetas. Junte os PDFs em um só.`);
    }
    const next = [...files, ...ok.slice(0, Math.max(0, room))];
    if (next.reduce((s, f) => s + f.size, 0) > MAX_LABELS_TOTAL_BYTES) {
      toast.error("As etiquetas somam mais de 4 MB. Junte e comprima em um só PDF.");
      setTooMany(true);
      return;
    }
    onChange(next);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={ref} type="file" multiple accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => pick(e.target.files)} />
      {files.map((f, i) => (
        <div key={i + f.name} className="flex items-center gap-3 rounded-xl bg-zinc-50 p-2.5 ring-1 ring-zinc-200">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white text-zinc-500 ring-1 ring-zinc-200">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{f.name}</p>
            <p className="text-xs text-zinc-500">{(f.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(files.filter((_, k) => k !== i));
              setTooMany(false);
            }}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white hover:text-zinc-700"
            aria-label="Remover"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      {!full && (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
        >
          <Plus className="size-4" />
          {files.length ? "Adicionar outra etiqueta" : "Anexar etiqueta (PDF)"}
        </button>
      )}
      <p className="text-xs text-zinc-500">
        Até {MAX_LABEL_FILES} arquivos (PDF ou foto){files.length > 0 && ` · ${files.length}/${MAX_LABEL_FILES} · ${total < 1024 * 1024 ? `${Math.max(1, Math.round(total / 1024))} KB` : `${(total / 1024 / 1024).toFixed(1)} MB`} de 4 MB`}. Vários arquivos viram um único PDF para o fornecedor.
      </p>
      <div className={cn("flex items-start gap-2 rounded-xl p-3 text-[13px]", tooMany || full ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200" : "bg-zinc-50 text-zinc-600")}>
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          Tem mais de {MAX_LABEL_FILES} etiquetas? Junte todos os PDFs em um só arquivo e anexe aqui.{" "}
          <a href={MERGE_PDF_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
            Juntar PDFs no iLovePDF <ExternalLink className="size-3" />
          </a>
        </span>
      </div>
    </div>
  );
}
