"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Algo deu errado</h1>
      <p className="mt-2 text-sm text-zinc-500">Tente novamente. Se continuar, recarregue a página.</p>
      <Button variant="dark" className="mt-5" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
