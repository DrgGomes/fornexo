"use client";

import { useState } from "react";
import { ChevronDown, Download, KeyRound } from "lucide-react";
import { regenerateImportToken } from "@/actions/imports";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useAction } from "@/components/ui/use-action";
import { cn } from "@/lib/utils";

export function ExtensionSetup({ connectedAt, defaultOpen }: { connectedAt: string | null; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [token, setToken] = useState<string | null>(null);
  const { exec, pending } = useAction();
  return (
    <div className="mb-5 overflow-hidden rounded-2xl bg-zinc-900 text-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-base font-extrabold text-zinc-900">F</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Extensão Fornexo Importador</span>
          <span className="block text-[13px] text-zinc-400">
            {connectedAt ? `Conectada em ${new Date(connectedAt).toLocaleDateString("pt-BR")}` : "Instale no Chrome para importar anúncios com um clique"}
          </span>
        </span>
        <ChevronDown className={cn("size-5 text-zinc-400 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-5 border-t border-white/10 px-5 py-5 lg:grid-cols-[1fr_300px]">
          <ol className="grid gap-3 text-sm text-zinc-300">
            {[
              <>
                Toque em <b className="text-white">Baixar extensão</b>. Ela já vem conectada à sua conta.
              </>,
              <>Descompacte o arquivo .zip baixado (clique com o botão direito e escolha Extrair).</>,
              <>
                No Chrome, abra <b className="text-white">chrome://extensions</b>, ative o <b className="text-white">Modo do desenvolvedor</b> no canto superior e clique em{" "}
                <b className="text-white">Carregar sem compactação</b>. Escolha a pasta <b className="text-white">fornexo-importador</b>.
              </>,
              <>
                Abra um anúncio no Mercado Livre, Shopee, TikTok Shop ou Temu e toque no botão <b className="text-white">IMPORTAR</b> no canto da tela.
              </>,
            ].map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-2">
            <a href="/api/extension" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
              <Download className="size-4" /> Baixar extensão
            </a>
            <p className="text-xs text-zinc-400">Baixar de novo gera uma nova conexão e desconecta a cópia anterior.</p>
            <Button
              variant="ghost"
              className="mt-2 text-zinc-300 hover:bg-white/10 hover:text-white"
              loading={pending}
              onClick={() => exec(() => regenerateImportToken(), { silent: true, refresh: false, onSuccess: (d) => d && setToken(d.token) })}
            >
              <KeyRound /> Gerar código de conexão manual
            </Button>
            {token && (
              <div className="rounded-xl bg-white/10 p-3">
                <p className="mb-1.5 text-xs text-zinc-300">Cole nas opções da extensão (Conexão). Mostrado apenas uma vez.</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs">{token}</code>
                  <CopyButton text={token} className="bg-white text-zinc-900 hover:bg-zinc-100" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
