"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white">
      <Printer className="size-4" /> Imprimir
    </button>
  );
}
