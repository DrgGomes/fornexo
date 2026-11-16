import { notFound } from "next/navigation";
import { SupplierLanding } from "@/components/landing/supplier-landing";
import { loadLanding } from "@/lib/landing-data";
import { getShowcaseSupplier } from "@/lib/showcase";

export default async function SupplierLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getShowcaseSupplier(slug);
  if (!s) notFound();
  const data = await loadLanding(s);
  return <SupplierLanding supplier={s} {...data} />;
}
