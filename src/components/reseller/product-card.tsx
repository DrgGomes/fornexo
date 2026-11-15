import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";
import { FavoriteButton } from "./favorite-button";

export type CatalogItem = {
  id: string;
  name: string;
  image: string | null;
  price: number;
  suggestedPrice: number | null;
  stock: number;
  sold: number;
  isNew: boolean;
  favorite: boolean;
  variantCount: number;
};

export function ProductCard({ p, href }: { p: CatalogItem; href: string }) {
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/70 transition hover:shadow-md hover:ring-zinc-300">
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        {p.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name} loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        )}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {p.isNew && <Badge tone="blue">Novo</Badge>}
          {p.stock <= 0 && <Badge tone="red">Esgotado</Badge>}
        </div>
        <div className="absolute top-2 right-2">
          <FavoriteButton productId={p.id} initial={p.favorite} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-[13px] leading-snug font-medium text-zinc-900 sm:text-sm">{p.name}</p>
        <div className="mt-auto pt-2">
          <p className="text-[15px] font-semibold tracking-tight">{brl(p.price)}</p>
          {p.suggestedPrice ? <p className="text-[11px] text-zinc-500">Venda sugerida {brl(p.suggestedPrice)}</p> : null}
          <p className="mt-1 text-[11px] text-zinc-400">
            {p.stock > 0 ? `${p.stock} em estoque` : "Sem estoque"}
            {p.variantCount > 1 && ` · ${p.variantCount} variações`}
            {p.sold > 0 && ` · ${p.sold} vendidos`}
          </p>
        </div>
      </div>
    </Link>
  );
}
