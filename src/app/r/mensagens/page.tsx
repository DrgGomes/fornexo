import { and, eq } from "drizzle-orm";
import { db, orders } from "@/db";
import { ChatThread } from "@/components/chat/chat-thread";
import { Avatar } from "@/components/ui/misc";
import { requireReseller } from "@/lib/auth";
import { chatContext, loadConversation } from "@/lib/chat-data";
import { whatsappLink } from "@/lib/utils";

export const metadata = { title: "Falar com fornecedor" };

export default async function ResellerMessages({ searchParams }: { searchParams: Promise<{ produto?: string; pedido?: string }> }) {
  const { reseller, supplier } = await requireReseller();
  const sp = await searchParams;
  const [msgs, ctx] = await Promise.all([loadConversation(supplier.id, reseller.id, false), chatContext(supplier.id, sp)]);
  const safeCtx = ctx?.orderId ? ((await isOwnOrder(ctx.orderId, reseller.id)) ? ctx : null) : ctx;
  const wa = whatsappLink(supplier.whatsapp);
  return (
    <div className="-mx-4 -mt-5 -mb-28 flex h-[calc(100dvh-3.5rem-4rem-1.75rem)] flex-col sm:-mt-6 lg:mx-auto lg:mt-0 lg:mb-0 lg:h-[calc(100dvh-4rem-4rem)] lg:max-w-3xl lg:overflow-hidden lg:rounded-2xl lg:ring-1 lg:ring-zinc-200/70">
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2.5">
        <Avatar name={supplier.name} src={supplier.logoUrl} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{supplier.name}</p>
          <p className="text-xs text-zinc-500">Atendimento ao revendedor</p>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white">
            WhatsApp
          </a>
        )}
      </div>
      <div className="min-h-0 flex-1 bg-zinc-50">
        <ChatThread initial={msgs} meIsSupplier={false} context={safeCtx} linkBase={{ product: "/r/catalogo", order: "/r/pedidos" }} />
      </div>
    </div>
  );
}

async function isOwnOrder(orderId: string, resellerId: string) {
  const o = await db.query.orders.findFirst({ where: and(eq(orders.id, orderId), eq(orders.resellerId, resellerId)), columns: { id: true } });
  return !!o;
}
