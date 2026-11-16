import { publicLandingUrl } from "@/lib/showcase-base";
import { LandingEditor } from "@/components/supplier/landing-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireSupplier } from "@/lib/auth";
import { autoRules, resolveLanding } from "@/lib/landing";
import { baseUrl } from "@/lib/url";

export const metadata = { title: "Minha página" };

export default async function MyLandingPage() {
  const { supplier: s } = await requireSupplier();
  const origin = await baseUrl();
  return (
    <>
      <PageHeader title="Minha página de cadastro" description="A landing page que seus futuros revendedores veem ao abrir o link de cadastro. Personalize tudo." />
      <LandingEditor
        initial={resolveLanding(s)}
        brand={{ logoUrl: s.logoUrl ?? "", bannerUrl: s.bannerUrl ?? "", primaryColor: s.primaryColor, whatsapp: s.whatsapp ?? "" }}
        landingUrl={publicLandingUrl(s, origin)}
        previewPath={`/v/${s.slug}/cadastro`}
        autoRules={autoRules(s)}
      />
    </>
  );
}
