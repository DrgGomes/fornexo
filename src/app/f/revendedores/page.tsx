import { publicLandingUrl } from "@/lib/showcase-base";
import Link from "next/link";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Users } from "lucide-react";
import { CreateResellerButton, QuickApprove } from "@/components/supplier/reseller-tools";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Avatar, EmptyState, PageHeader, TabLinks } from "@/components/ui/misc";
import { SearchInput } from "@/components/ui/search-input";
import { db, orders, resellers, users } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { brl, timeAgo } from "@/lib/format";
import { baseUrl } from "@/lib/url";

export const metadata = { title: "Revendedores" };

export default async function ResellersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { supplier } = await requireSupplier();
  const sp = await searchParams;
  const status = (["ACTIVE", "PENDING", "BLOCKED"].includes(sp.status ?? "") ? sp.status : "ACTIVE") as "ACTIVE" | "PENDING" | "BLOCKED";
  const conds: SQL[] = [eq(resellers.supplierId, supplier.id), eq(resellers.status, status)];
  if (sp.q) conds.push(or(ilike(resellers.name, `%${sp.q}%`), ilike(resellers.storeName, `%${sp.q}%`), ilike(users.email, `%${sp.q}%`), ilike(resellers.phone, `%${sp.q}%`))!);

  const [rows, counts, origin] = await Promise.all([
    db
      .select({
        id: resellers.id,
        name: resellers.name,
        storeName: resellers.storeName,
        phone: resellers.phone,
        balance: resellers.balance,
        createdAt: resellers.createdAt,
        email: users.email,
        marketplaces: resellers.marketplaces,
        orders: sql<number>`(select count(*) from orders oo where oo.reseller_id = "resellers"."id" and oo.status <> 'CANCELED')::int`,
        spent: sql<number>`(select coalesce(sum(oo.total),0) from orders oo where oo.reseller_id = "resellers"."id" and oo.status <> 'CANCELED')::int`,
        lastOrder: sql<Date | null>`(select max(oo.created_at) from orders oo where oo.reseller_id = "resellers"."id")`,
      })
      .from(resellers)
      .leftJoin(users, eq(users.resellerId, resellers.id))
      .where(and(...conds))
      .orderBy(desc(resellers.createdAt))
      .limit(300),
    db.select({ status: resellers.status, n: count() }).from(resellers).where(eq(resellers.supplierId, supplier.id)).groupBy(resellers.status),
    baseUrl(),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.status, x.n]));
  const link = publicLandingUrl(supplier, origin);

  return (
    <>
      <PageHeader title="Revendedores" description="Quem vende seus produtos nos marketplaces" actions={<CreateResellerButton />} />

      <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Link da sua página de cadastro</p>
          <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">{link}</p>
        </div>
        <div className="flex gap-2">
          <CopyButton text={link} label="Copiar link" />
          <Link href="/f/minha-pagina" className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-medium ring-1 ring-zinc-200 hover:bg-zinc-50">
            Personalizar
          </Link>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Cadastre-se para revender nossos produtos: ${link}`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white"
          >
            Enviar no WhatsApp
          </a>
        </div>
      </Card>

      <TabLinks
        items={[
          { href: "/f/revendedores?status=ACTIVE", label: "Ativos", count: c.ACTIVE, active: status === "ACTIVE" },
          { href: "/f/revendedores?status=PENDING", label: "Aguardando aprovação", count: c.PENDING, active: status === "PENDING" },
          { href: "/f/revendedores?status=BLOCKED", label: "Bloqueados", count: c.BLOCKED, active: status === "BLOCKED" },
        ]}
      />
      <SearchInput placeholder="Buscar por nome, loja, e-mail ou telefone" className="mb-4" />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={<Users />} title="Nenhum revendedor aqui" description="Compartilhe o link de cadastro para receber revendedores." />
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <Link key={r.id} href={`/f/revendedores/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 sm:px-5">
                <Avatar name={r.storeName || r.name} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.storeName || r.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {r.storeName ? `${r.name} · ` : ""}
                    {r.email}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {r.orders} pedidos · {brl(r.spent)} · {r.lastOrder ? `último ${timeAgo(r.lastOrder)}` : `cadastro ${timeAgo(r.createdAt)}`}
                  </p>
                </div>
                {status === "PENDING" ? (
                  <QuickApprove id={r.id} />
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Saldo</p>
                    <p className="text-sm font-semibold tabular-nums">{brl(r.balance)}</p>
                  </div>
                )}
                {status === "BLOCKED" && <Badge tone="red">Bloqueado</Badge>}
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
