"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleFavorite } from "@/actions/reseller";
import { cn } from "@/lib/utils";

export function FavoriteButton({ productId, initial, variant = "icon" }: { productId: string; initial: boolean; variant?: "icon" | "button" }) {
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);
  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setFav(!fav);
    const res = await toggleFavorite(productId);
    setBusy(false);
    if (!res.ok) {
      setFav(fav);
      toast.error(res.error);
    } else toast.success(res.data?.favorite ? "Adicionado aos meus produtos" : "Removido dos meus produtos");
  }
  if (variant === "button")
    return (
      <button
        onClick={toggle}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium ring-1 transition active:scale-95",
          fav ? "bg-rose-50 text-rose-600 ring-rose-200" : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
        )}
      >
        <Heart className={cn("size-4", fav && "fill-current")} />
        {fav ? "Nos meus produtos" : "Vou anunciar"}
      </button>
    );
  return (
    <button
      onClick={toggle}
      aria-label={fav ? "Remover dos meus produtos" : "Adicionar aos meus produtos"}
      className={cn("flex size-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition active:scale-90", fav ? "text-rose-500" : "text-zinc-500")}
    >
      <Heart className={cn("size-[18px]", fav && "fill-current")} />
    </button>
  );
}
