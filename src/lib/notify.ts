import { db, notifications, type Tx } from "@/db";

type N = { supplierId: string; resellerId?: string | null; toSupplier: boolean; title: string; body?: string; href?: string };

export async function notify(n: N, tx?: Tx) {
  const exec = tx ?? db;
  await exec.insert(notifications).values({
    supplierId: n.supplierId,
    resellerId: n.resellerId ?? null,
    toSupplier: n.toSupplier,
    title: n.title,
    body: n.body,
    href: n.href,
  });
}
