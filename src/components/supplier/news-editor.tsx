"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deletePost, savePost } from "@/actions/news";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/components/ui/use-action";

type Post = { id?: string; title: string; content: string; coverUrl: string | null; pinned: boolean; published: boolean };
const empty: Post = { title: "", content: "", coverUrl: "", pinned: false, published: true };

export function NewsEditorButton({ post }: { post?: Post }) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<Post>(post ?? empty);
  const [notifyAll, setNotifyAll] = useState(true);
  const { exec, pending } = useAction();
  return (
    <>
      {post ? (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Editar">
          <Pencil />
        </Button>
      ) : (
        <Button onClick={() => (setP(empty), setOpen(true))}>
          <Plus /> Nova notícia
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={post ? "Editar notícia" : "Nova notícia"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button loading={pending} onClick={() => exec(() => savePost({ ...p, notify: !post && notifyAll }), { onSuccess: () => setOpen(false) })}>
              {post ? "Salvar" : "Publicar"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="Título">
            <Input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} placeholder="Ex: Reposição do Fone TWS chegou" />
          </Field>
          <Field label="Imagem de capa (link, opcional)">
            <Input value={p.coverUrl ?? ""} onChange={(e) => setP({ ...p, coverUrl: e.target.value })} placeholder="https://" />
          </Field>
          <Field label="Conteúdo">
            <Textarea value={p.content} onChange={(e) => setP({ ...p, content: e.target.value })} className="min-h-48" />
          </Field>
          <Switch checked={p.pinned} onChange={(v) => setP({ ...p, pinned: v })} label="Fixar no topo" />
          <Switch checked={p.published} onChange={(v) => setP({ ...p, published: v })} label="Publicada" description="Desligue para salvar como rascunho" />
          {!post && <Switch checked={notifyAll} onChange={setNotifyAll} label="Notificar todos os revendedores" />}
        </div>
      </Modal>
    </>
  );
}

export function DeletePostButton({ id }: { id: string }) {
  const { exec } = useAction();
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => confirm("Remover esta notícia?") && exec(() => deletePost(id))} aria-label="Remover" className="hover:text-red-600">
      <Trash2 />
    </Button>
  );
}
