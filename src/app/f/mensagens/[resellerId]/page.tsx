import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ChatThread } from "@/components/chat/chat-thread";
import { ConversationList } from "@/components/chat/conversation-list";
import { Avatar } from "@/components/ui/misc";
import { db, resellers } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { chatContext, listConversations, loadConversation } from "@/lib/chat-data";

export const metadata = { title: "Conversa" };

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ resellerId: string }>; searchParams: Promise<{ produto?: string; pedido?: string }> }) {
  const { resellerId } = await params;
  const sp = await searchParams;
  const { supplier } = await requireSupplier();
  const r = await db.query.resellers.findFirst({ where: and(eq(resellers.id, resellerId), eq(resellers.supplierId, supplier.id)) });
  if (!r) notFound();
  const [msgs, convs, ctx] = await Promise.all([loadConversation(supplier.id, r.id, true), listConversations(supplier.id), chatContext(supplier.id, sp)]);
  return (
    <div className="-mx-4 -mt-5 -mb-28 flex h-[calc(100dvh-3.5rem-4rem)] sm:-mt-6 lg:mx-0 lg:mt-0 lg:mb-0 lg:h-[calc(100dvh-4rem-4rem)] lg:overflow-hidden lg:rounded-2xl lg:ring-1 lg:ring-zinc-200/70">
      <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white lg:block">
        <ConversationList rows={convs} activeId={r.id} />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-zinc-50">
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-3 py-2.5">
          <Link href="/f/mensagens" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden" aria-label="Voltar">
            <ChevronLeft className="size-5" />
          </Link>
          <Avatar name={r.storeName || r.name} size={36} />
          <Link href={`/f/revendedores/${r.id}`} className="min-w-0">
            <p className="truncate text-sm font-semibold">{r.storeName || r.name}</p>
            <p className="truncate text-xs text-zinc-500">{r.phone}</p>
          </Link>
        </div>
        <div className="min-h-0 flex-1">
          <ChatThread initial={msgs} resellerId={r.id} meIsSupplier context={ctx} linkBase={{ product: "/f/produtos", order: "/f/pedidos" }} />
        </div>
      </section>
    </div>
  );
}
