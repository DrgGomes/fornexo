import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";
import { AdminCreateSupplier } from "@/components/admin-tools";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { SearchInput } from "@/components/ui/search-input";
import { db, suppliers } from "@/db";
import { requireAdmin, supplierAccess } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Fornecedores" };

export default async function AdminSuppliers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const rows = await db
    .select({
      s: suppliers,
      resellers: sql<number>`(select count(*) from resellers r where r.supplier_id = "suppliers"."id")::int`,
      products: sql<number>`(select count(*) from products p where p.supplier_id = "suppliers"."id")::int`,
      orders30: sql<number>`(select count(*) from orders o where o.supplier_id = "suppliers"."id" and o.created_at > now() - interval '30 days')::int`,
    })
    .from(suppliers)
    .where(q ? or(ilike(suppliers.name, `%${q}%`), ilike(suppliers.email, `%${q}%`), ilike(suppliers.slug, `%${q}%`)) : undefined)
    .orderBy(desc(suppliers.createdAt))
    .limit(500);
  return (
    <>
      <PageHeader title="Fornecedores" description={`${rows.length} contas`} actions={<AdminCreateSupplier />} />
      <SearchInput placeholder="Buscar por nome, e-mail ou endereço" className="mb-4" />
      <Card className="overflow-hidden">
        <div className="divide-y divide-zinc-100">
          {rows.map(({ s, resellers, products, orders30 }) => {
            const acc = supplierAccess(s);
            return (
              <Link key={s.id} href={`/admin/fornecedores/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 sm:px-5">
                <Avatar name={s.name} src={s.logoUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {s.email} · /v/{s.slug}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {products} produtos · {resellers} revendedores · {orders30} pedidos em 30 dias
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!acc.ok ? <Badge tone="red">{s.status === "BLOCKED" ? "Bloqueado" : "Vencido"}</Badge> : s.status === "TRIAL" ? <Badge tone="amber">Teste</Badge> : <Badge tone="emerald">Ativo</Badge>}
                  <span className="text-[11px] text-zinc-400">
                    {s.status === "TRIAL" ? `até ${formatDate(s.trialEndsAt)}` : s.paidUntil ? `pago até ${formatDate(s.paidUntil)}` : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </>
  );
}
