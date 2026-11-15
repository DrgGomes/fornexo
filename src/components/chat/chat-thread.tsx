"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Package, ReceiptText, Send, X } from "lucide-react";
import { toast } from "sonner";
import { fetchMessages, sendMessage, type ChatMessage } from "@/actions/messages";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ChatThread({
  initial,
  resellerId,
  meIsSupplier,
  context,
  linkBase,
}: {
  initial: ChatMessage[];
  resellerId?: string;
  meIsSupplier: boolean;
  context?: { productId?: string; orderId?: string; label: string; draft?: string } | null;
  linkBase: { product: string; order: string };
}) {
  const [list, setList] = useState(initial);
  const [text, setText] = useState(context?.draft ?? "");
  const [ctx, setCtx] = useState(context ?? null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(initial.at(-1)?.createdAt);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

  useEffect(() => {
    const t = setInterval(async () => {
      if (document.hidden) return;
      const res = await fetchMessages({ resellerId, after: lastRef.current });
      if (res.ok && res.data && res.data.length) {
        setList((l) => {
          const ids = new Set(l.map((m) => m.id));
          const add = res.data!.filter((m) => !ids.has(m.id));
          return add.length ? [...l, ...add] : l;
        });
        lastRef.current = res.data.at(-1)!.createdAt;
      }
    }, 4000);
    return () => clearInterval(t);
  }, [resellerId]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await sendMessage({ resellerId, body, productId: ctx?.productId, orderId: ctx?.orderId });
    setSending(false);
    if (!res.ok) return toast.error(res.error);
    setText("");
    setCtx(null);
    setList((l) => [...l, res.data!]);
    lastRef.current = res.data!.createdAt;
  }

  let lastDay = "";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
        {list.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Nenhuma mensagem ainda. Diga olá.</p>}
        <div className="flex flex-col gap-1.5">
          {list.map((m) => {
            const mine = m.fromSupplier === meIsSupplier;
            const day = formatDate(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id}>
                {showDay && <p className="my-3 text-center text-[11px] font-medium text-zinc-400">{day}</p>}
                <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed", mine ? "rounded-br-md bg-brand text-brand-fg" : "rounded-bl-md bg-white ring-1 ring-zinc-200")}>
                    {!mine && <p className="mb-0.5 text-[11px] font-semibold opacity-60">{m.authorName}</p>}
                    {(m.productId || m.orderId) && (
                      <Link
                        href={m.productId ? `${linkBase.product}/${m.productId}` : `${linkBase.order}/${m.orderId}`}
                        className={cn("mb-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium", mine ? "bg-white/20" : "bg-zinc-100")}
                      >
                        {m.productId ? <Package className="size-3" /> : <ReceiptText className="size-3" />}
                        {m.productId ? "Ver produto" : "Ver pedido"}
                      </Link>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={cn("mt-0.5 text-right text-[10px]", mine ? "opacity-70" : "text-zinc-400")}>{formatTime(m.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={endRef} />
      </div>
      <div className="border-t border-zinc-200 bg-white p-2.5 sm:p-3">
        {ctx && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs ring-1 ring-zinc-200">
            {ctx.productId ? <Package className="size-3.5 text-zinc-500" /> : <ReceiptText className="size-3.5 text-zinc-500" />}
            <span className="min-w-0 flex-1 truncate font-medium">{ctx.label}</span>
            <button onClick={() => setCtx(null)} className="text-zinc-400 hover:text-zinc-700" aria-label="Remover contexto">
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Escreva uma mensagem"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-zinc-100 px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-brand sm:text-sm"
          />
          <button type="submit" disabled={sending || !text.trim()} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg transition disabled:opacity-40" aria-label="Enviar">
            <Send className="size-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
