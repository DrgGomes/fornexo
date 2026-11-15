import { CostsForm, FeeProfilesForm, ResellerProfileForm } from "@/components/reseller/settings-forms";
import { PasswordForm } from "@/components/supplier/settings-forms";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireReseller } from "@/lib/auth";
import { loadPricing } from "@/lib/reseller-data";

export const metadata = { title: "Configurações" };

const TABS = [
  { id: "taxas", label: "Taxas e custos" },
  { id: "perfil", label: "Perfil" },
  { id: "senha", label: "Senha" },
];

export default async function ResellerSettings({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { reseller } = await requireReseller();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "taxas";
  const pricing = tab === "taxas" ? await loadPricing(reseller) : null;
  return (
    <>
      <PageHeader title="Configurações" />
      <TabLinks items={TABS.map((t) => ({ href: `/r/configuracoes?tab=${t.id}`, label: t.label, active: t.id === tab }))} />
      <div className="flex max-w-4xl flex-col gap-5">
        {pricing && (
          <>
            <CostsForm initial={pricing.costs} />
            <FeeProfilesForm initial={pricing.profiles} />
          </>
        )}
        {tab === "perfil" && (
          <ResellerProfileForm
            initial={{ name: reseller.name, storeName: reseller.storeName ?? "", phone: reseller.phone ?? "", document: reseller.document ?? "", marketplaces: reseller.marketplaces }}
          />
        )}
        {tab === "senha" && <PasswordForm />}
      </div>
    </>
  );
}
