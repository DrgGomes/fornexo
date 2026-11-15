"use client";

import { useRouter } from "next/navigation";
import { Archive, Copy, Eye, Pencil, Star, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct, duplicateProduct, setProductStatus, toggleFeatured } from "@/actions/products";
import { Dropdown } from "@/components/ui/dropdown";
import { useAction } from "@/components/ui/use-action";

export function ProductRowActions({ id, status, featured, slug }: { id: string; status: string; featured: boolean; slug: string }) {
  const router = useRouter();
  const { exec } = useAction();
  return (
    <Dropdown
      items={[
        { label: "Editar", icon: <Pencil />, onClick: () => router.push(`/f/produtos/${id}`) },
        { label: "Ver na vitrine", icon: <Eye />, onClick: () => window.open(`/v/${slug}/p/${id}`, "_blank") },
        {
          label: "Duplicar",
          icon: <Copy />,
          onClick: () => exec(() => duplicateProduct(id), { onSuccess: (d) => d && router.push(`/f/produtos/${d.id}`) }),
        },
        { label: featured ? "Remover destaque" : "Destacar na vitrine", icon: <Star />, onClick: () => exec(() => toggleFeatured(id)) },
        status === "ARCHIVED"
          ? { label: "Reativar", icon: <Undo2 />, onClick: () => exec(() => setProductStatus(id, "ACTIVE")) }
          : { label: "Arquivar", icon: <Archive />, onClick: () => exec(() => setProductStatus(id, "ARCHIVED")) },
        {
          label: "Excluir",
          icon: <Trash2 />,
          danger: true,
          onClick: () => {
            if (!confirm("Excluir este produto? Se ele já tiver pedidos, será apenas arquivado.")) return;
            exec(() => deleteProduct(id), {
              silent: true,
              onSuccess: (d) => toast.success(d?.archived ? "Produto possui pedidos e foi arquivado" : "Produto excluído"),
            });
          },
        },
      ]}
    />
  );
}
