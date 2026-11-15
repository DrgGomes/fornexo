import { asc, eq } from "drizzle-orm";
import { PasswordForm, PaymentForm, RulesForm, ShowcaseForm, StoreForm, TeamForm } from "@/components/supplier/settings-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KeyValue, PageHeader, TabLinks } from "@/components/ui/misc";
import { db, users } from "@/db";
import { requireSupplier } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { baseUrl } from "@/lib/url";

export const metadata = { title: "Configurações" };

const TABS = [
  { id: "loja", label: "Empresa" },
  { id: "vitrine", label: "Vitrine e marca" },
  { id: "regras", label: "Regras" },
  { id: "pagamento", label: "PIX" },
  { id: "equipe", label: "Equipe" },
  { id: "plano", label: "Plano" },
  { id: "senha", label: "Senha" },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supplier: s, user, access } = await requireSupplier();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "loja";
  const team =
    tab === "equipe"
      ? await db.select().from(users).where(eq(users.supplierId, s.id)).orderBy(asc(users.createdAt))
      : [];
  const origin = await baseUrl();
  return (
    <>
      <PageHeader title="Configurações" />
      <TabLinks items={TABS.map((t) => ({ href: `/f/configuracoes?tab=${t.id}`, label: t.label, active: t.id === tab }))} />
      <div className="max-w-3xl">
        {tab === "loja" && (
          <StoreForm
            initial={{ name: s.name, document: s.document ?? "", email: s.email, phone: s.phone ?? "", whatsapp: s.whatsapp ?? "", city: s.city ?? "", state: s.state ?? "" }}
          />
        )}
        {tab === "vitrine" && (
          <ShowcaseForm
            origin={origin}
            initial={{
              slug: s.slug,
              logoUrl: s.logoUrl ?? "",
              bannerUrl: s.bannerUrl ?? "",
              primaryColor: s.primaryColor,
              description: s.description ?? "",
              showcasePublic: s.showcasePublic,
              showcaseShowPrices: s.showcaseShowPrices,
            }}
          />
        )}
        {tab === "regras" && (
          <RulesForm initial={{ handlingFee: s.handlingFee, autoApproveResellers: s.autoApproveResellers, requireLabel: s.requireLabel, shippingDeadline: s.shippingDeadline ?? "" }} />
        )}
        {tab === "pagamento" && <PaymentForm initial={{ pixKey: s.pixKey ?? "", pixHolder: s.pixHolder ?? "", pixCity: s.pixCity ?? "" }} />}
        {tab === "equipe" && (
          <TeamForm meId={user.id} members={team.map((m) => ({ id: m.id, name: m.name, email: m.email, active: m.active, lastLoginAt: m.lastLoginAt?.toISOString() ?? null }))} />
        )}
        {tab === "plano" && (
          <Card>
            <CardHeader title="Seu plano" />
            <CardBody className="divide-y divide-zinc-100 pt-0">
              <KeyValue label="Plano">{s.plan}</KeyValue>
              <KeyValue label="Situação">{s.status === "TRIAL" ? "Período de teste" : s.status === "ACTIVE" ? "Ativo" : "Bloqueado"}</KeyValue>
              {s.status === "TRIAL" && <KeyValue label="Teste termina em">{formatDate(s.trialEndsAt)}{access.daysLeft !== undefined && ` (${access.daysLeft} dias)`}</KeyValue>}
              {s.paidUntil && <KeyValue label="Pago até">{formatDate(s.paidUntil)}</KeyValue>}
              <p className="pt-3 text-sm text-zinc-500">Para contratar ou renovar, fale com o suporte da plataforma.</p>
            </CardBody>
          </Card>
        )}
        {tab === "senha" && <PasswordForm />}
      </div>
    </>
  );
}
