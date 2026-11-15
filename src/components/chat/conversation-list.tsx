import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Avatar, EmptyState } from "@/components/ui/misc";
import type { ConversationRow } from "@/lib/chat-data";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ConversationList({ rows, activeId }: { rows: ConversationRow[]; activeId?: string }) {
  if (!rows.length) return <EmptyState icon={<MessageCircle />} title="Nenhuma conversa" description="Abra o perfil de um revendedor para iniciar uma conversa." />;
  return (
    <div className="divide-y divide-zinc-100">
      {rows.map((c) => (
        <Link key={c.resellerId} href={`/f/mensagens/${c.resellerId}`} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-zinc-50", activeId === c.resellerId && "bg-zinc-100")}>
          <Avatar name={c.name} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className={cn("truncate text-sm", c.unread ? "font-bold" : "font-semibold")}>{c.name}</p>
              <span className="shrink-0 text-[11px] text-zinc-400">{timeAgo(c.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className={cn("truncate text-[13px]", c.unread ? "text-zinc-900" : "text-zinc-500")}>
                {c.fromSupplier && "Você: "}
                {c.body}
              </p>
              {c.unread > 0 && <span className="shrink-0 rounded-full bg-brand px-1.5 text-[11px] font-semibold text-brand-fg">{c.unread}</span>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
