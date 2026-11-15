import Link from "next/link";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationsList({ rows }: { rows: { id: string; title: string; body: string | null; href: string | null; readAt: Date | null; createdAt: Date }[] }) {
  return (
    <Card className="overflow-hidden">
      {rows.length === 0 ? (
        <EmptyState icon={<Bell />} title="Tudo em dia" description="Você não tem notificações." />
      ) : (
        <div className="divide-y divide-zinc-100">
          {rows.map((n) => {
            const inner = (
              <div className={cn("flex items-start gap-3 px-4 py-3.5 sm:px-5", !n.readAt && "bg-brand/5")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-zinc-200" : "bg-brand")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-[13px] text-zinc-500">{n.body}</p>}
                </div>
                <span className="shrink-0 text-xs text-zinc-400">{timeAgo(n.createdAt)}</span>
              </div>
            );
            return n.href ? (
              <Link key={n.id} href={n.href} className="block hover:bg-zinc-50">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
