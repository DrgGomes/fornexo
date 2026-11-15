"use client";

import { useState } from "react";
import { Pencil, Tags, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/components/ui/use-action";

export function CategoriesManager({ categories }: { categories: { id: string; name: string; count: number }[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const { exec, pending } = useAction();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Tags /> Categorias
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Categorias" description="Organize o catálogo para o revendedor filtrar mais rápido.">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            exec(() => saveCategory({ name }), { onSuccess: () => setName("") });
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" />
          <Button type="submit" variant="dark" loading={pending}>
            Adicionar
          </Button>
        </form>
        <div className="mt-4 divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200">
          {categories.length === 0 && <p className="p-4 text-sm text-zinc-500">Nenhuma categoria ainda.</p>}
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2">
              {editing === c.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    exec(() => saveCategory({ id: c.id, name: editName }), { onSuccess: () => setEditing(null) });
                  }}
                >
                  <Input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} />
                  <Button type="submit" size="md">
                    Salvar
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-zinc-400">{c.count} produtos</span>
                  <button
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
                    onClick={() => {
                      setEditing(c.id);
                      setEditName(c.name);
                    }}
                    aria-label="Renomear"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => confirm(`Remover "${c.name}"? Os produtos ficam sem categoria.`) && exec(() => deleteCategory(c.id))}
                    aria-label="Remover"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
