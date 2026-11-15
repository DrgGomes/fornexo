import { desc, eq } from "drizzle-orm";
import { Newspaper } from "lucide-react";
import { PostCard } from "@/components/news/post-card";
import { DeletePostButton, NewsEditorButton } from "@/components/supplier/news-editor";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { db, posts } from "@/db";
import { requireSupplier } from "@/lib/auth";

export const metadata = { title: "Notícias" };

export default async function NewsPage() {
  const { supplier } = await requireSupplier();
  const list = await db.query.posts.findMany({ where: eq(posts.supplierId, supplier.id), orderBy: [desc(posts.pinned), desc(posts.createdAt)], limit: 100 });
  return (
    <>
      <PageHeader title="Notícias" description="Comunicados que aparecem no portal dos revendedores" actions={<NewsEditorButton />} />
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<Newspaper />} title="Nenhuma notícia publicada" description="Avise lançamentos, reposições, promoções e mudanças de prazo." />
        </Card>
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {list.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              actions={
                <>
                  <NewsEditorButton post={{ id: p.id, title: p.title, content: p.content, coverUrl: p.coverUrl, pinned: p.pinned, published: p.published }} />
                  <DeletePostButton id={p.id} />
                </>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
