import { count, ne, sum } from "drizzle-orm";
import { AdminCreateSupplier, AdminSeedButton } from "@/components/admin-tools";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { db, orders, products, resellers, suppliers } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/format";

export const metadata = { title: "Administração" };

export default async function AdminHome() {
  await requireAdmin();
  const [byStatus, [r], [o], [p]] = await Promise.all([
    db.select({ s: suppliers.status, n: count() }).from(suppliers).groupBy(suppliers.status),
    db.select({ n: count() }).from(resellers),
    db.select({ n: count(), total: sum(orders.total) }).from(orders).where(ne(orders.status, "CANCELED")),
    db.select({ n: count() }).from(products),
  ]);
  const c = Object.fromEntries(byStatus.map((x) => [x.s, x.n]));
  return (
    <>
      <PageHeader
        title="Visão geral da plataforma"
        actions={
          <>
            <AdminSeedButton />
            <AdminCreateSupplier />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard accent label="Fornecedores ativos" value={c.ACTIVE ?? 0} hint={`${c.TRIAL ?? 0} em teste · ${c.BLOCKED ?? 0} bloqueados`} href="/admin/fornecedores" />
        <StatCard label="Revendedores" value={r.n} />
        <StatCard label="Pedidos processados" value={o.n} hint={`GMV ${brl(Number(o.total ?? 0))}`} />
        <StatCard label="Produtos cadastrados" value={p.n} />
      </div>
      <div className="mt-6">
        <ButtonLink href="/admin/fornecedores" variant="secondary">
          Gerenciar fornecedores
        </ButtonLink>
      </div>
    </>
  );
}
