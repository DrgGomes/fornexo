"use client";

import { useState } from "react";
import { optimizedImage } from "@/lib/img";
import { cn } from "@/lib/utils";

/**
 * Imagem otimizada: carrega versao leve redimensionada; se o CDN falhar, cai para o original.
 * `size` = largura exibida em px (dobrada para telas retina).
 */
export function SmartImg({
  src,
  alt = "",
  size,
  height,
  fit,
  className,
  eager,
}: {
  src: string | null | undefined;
  alt?: string;
  size: number;
  height?: number;
  fit?: "cover" | "inside";
  className?: string;
  eager?: boolean;
}) {
  const [fallback, setFallback] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={cn("block bg-zinc-100", className)} aria-hidden />;
  const url = fallback ? src : optimizedImage(src, size * 2, { height: height ? height * 2 : undefined, fit });
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      className={className}
      onError={() => (fallback ? setFailed(true) : setFallback(true))}
    />
  );
}
