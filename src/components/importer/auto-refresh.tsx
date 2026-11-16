"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Atualiza a lista sozinha enquanto a aba estiver visivel (novos anuncios chegam pela extensao). */
export function AutoRefresh({ ms = 8000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, ms);
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [ms, router]);
  return null;
}
