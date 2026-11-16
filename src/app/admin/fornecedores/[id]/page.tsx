import { asc, count, eq, sum } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AdminSupplierForm } from "@/components/admin-tools";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KeyValue, PageHeader, StatCard } from "@/components/ui/misc";
import { db, orders, resellers, suppliers, users } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { brl, formatDate, formatDateTime, spDateKey } from "@/lib/format";

export const metadata = { title: "Fornecedor" };

export default async function AdminSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const s = await db.query.suppliers.findFirst({ where: eq(suppliers.id, id) });
  if (!s) notFound();
  const [team, [o], [r]] = await Promise.all([
    db.select().from(users).where(eq(users.supplierId, s.id)).orderBy(asc(users.createdAt)),
    db.select({ n: count(), total: sum(orders.total) }).from(orders).where(eq(orders.supplierId, s.id)),
    db.select({ n: count() }).from(resellers).where(eq(resellers.supplierId, s.id)),
  ]);
  return (
    <>
      <PageHeader title={s.name} description={`Criado em ${formatDate(s.createdAt)} · /v/${s.slug}${s.customDomain ? ` · ${s.customDomain}` : ""}`} back="/admin/fornecedores" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Pedidos" value={o.n} hint={brl(Number(o.total ?? 0))} />
        <StatCard label="Revendedores" value={r.n} />
        <StatCard label="Usuários" value={team.length} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Assinatura" />
          <CardBody>
            <AdminSupplierForm
              id={s.id}
              initial={{
                status: s.status,
                plan: s.plan,
                trialEndsAt: s.trialEndsAt ? spDateKey(s.trialEndsAt) : null,
                paidUntil: s.paidUntil ? spDateKey(s.paidUntil) : null,
                adminNotes: s.adminNotes ?? "",
                importerEnabled: s.importerEnabled,
                customDomainEnabled: s.customDomainEnabled,
              }}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Contato e equipe" />
          <CardBody className="divide-y divide-zinc-100 pt-0">
            <KeyValue label="E-mail">{s.email}</KeyValue>
            <KeyValue label="WhatsApp">{s.whatsapp || s.phone || "-"}</KeyValue>
            {team.map((u) => (
              <KeyValue key={u.id} label={u.name}>
                <span className="text-xs">
                  {u.email}
                  <br />
                  <span className="text-zinc-400">{u.lastLoginAt ? `acesso ${formatDateTime(u.lastLoginAt)}` : "nunca acessou"}</span>
                </span>
              </KeyValue>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
