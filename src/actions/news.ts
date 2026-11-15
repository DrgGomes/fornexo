"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, notifications, posts, resellers } from "@/db";
import { fail, run } from "@/lib/action";
import { requireSupplier } from "@/lib/auth";
import { normalizeImageUrl } from "@/lib/images";

const schema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Informe o título").max(160),
  content: z.string().trim().min(1, "Escreva o conteúdo").max(20000),
  coverUrl: z.string().trim().max(1000).optional().nullable(),
  pinned: z.boolean(),
  published: z.boolean(),
  notify: z.boolean().optional(),
});

export async function savePost(input: z.infer<typeof schema>) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const d = schema.parse(input);
    const values = { title: d.title, content: d.content, coverUrl: d.coverUrl ? normalizeImageUrl(d.coverUrl) : null, pinned: d.pinned, published: d.published };
    let id = d.id;
    if (id) {
      const res = await db.update(posts).set(values).where(and(eq(posts.id, id), eq(posts.supplierId, supplier.id))).returning({ id: posts.id });
      if (!res.length) fail("Notícia não encontrada.");
    } else {
      const [p] = await db.insert(posts).values({ ...values, supplierId: supplier.id, authorName: user.name }).returning({ id: posts.id });
      id = p.id;
      if (d.published && d.notify) {
        const list = await db.select({ id: resellers.id }).from(resellers).where(and(eq(resellers.supplierId, supplier.id), eq(resellers.status, "ACTIVE")));
        if (list.length)
          await db.insert(notifications).values(list.map((r) => ({ supplierId: supplier.id, resellerId: r.id, toSupplier: false, title: `Novidade: ${d.title}`, href: "/r/noticias" })));
      }
    }
    return { id };
  }, "Notícia salva");
}

export async function deletePost(id: string) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    await db.delete(posts).where(and(eq(posts.id, id), eq(posts.supplierId, supplier.id)));
  }, "Notícia removida");
}
