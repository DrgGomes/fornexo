import { Pin } from "lucide-react";
import { SmartImg } from "@/components/ui/smart-img";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export function PostCard({
  post,
  actions,
}: {
  post: { title: string; content: string; coverUrl: string | null; pinned: boolean; published: boolean; createdAt: Date; authorName: string | null };
  actions?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      {post.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <SmartImg src={post.coverUrl} size={700} height={292} className="aspect-[2.4/1] w-full object-cover" />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
              {post.pinned && (
                <span className="inline-flex items-center gap-1 font-medium text-brand">
                  <Pin className="size-3" /> Fixado
                </span>
              )}
              {!post.published && <span className="font-medium text-amber-600">Rascunho</span>}
              <span>{formatDate(post.createdAt)}</span>
              {post.authorName && <span>· {post.authorName}</span>}
            </div>
            <h3 className="text-[17px] font-semibold tracking-tight">{post.title}</h3>
          </div>
          {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
        </div>
        <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-600">{post.content}</p>
      </div>
    </Card>
  );
}
