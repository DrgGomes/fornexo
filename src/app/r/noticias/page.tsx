import { and, desc, eq } from "drizzle-orm";
import { Newspaper } from "lucide-react";
import { PostCard } from "@/components/news/post-card";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { db, posts, resellers } from "@/db";
import { requireReseller } from "@/lib/auth";

export const metadata = { title: "Notícias" };

export default async function ResellerNews() {
  const { reseller, supplier } = await requireReseller();
  const list = await db.query.posts.findMany({
    where: and(eq(posts.supplierId, supplier.id), eq(posts.published, true)),
    orderBy: [desc(posts.pinned), desc(posts.createdAt)],
    limit: 50,
  });
  await db.update(resellers).set({ newsSeenAt: new Date() }).where(eq(resellers.id, reseller.id));
  return (
    <>
      <PageHeader title="Notícias" description={`Comunicados de ${supplier.name}`} />
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<Newspaper />} title="Nenhuma notícia por enquanto" />
        </Card>
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {list.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </>
  );
}
