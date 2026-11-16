import Link from "next/link";
import { AppShell, type NavGroup, type NavItem } from "@/components/shell/app-shell";
import { requireReseller } from "@/lib/auth";
import { resellerCounts } from "@/lib/counts";
import { brl } from "@/lib/format";
import { contrastText, safeColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { supplier } = await requireReseller();
  return { title: { default: supplier.name, template: `%s | ${supplier.name}` }, applicationName: supplier.name };
}

export default async function ResellerLayout({ children }: { children: React.ReactNode }) {
  const { user, reseller, supplier } = await requireReseller();
  const c = await resellerCounts(reseller.id, supplier.id, reseller.newsSeenAt);
  const color = safeColor(supplier.primaryColor);

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/r", label: "Início", icon: "home", exact: true },
        { href: "/r/catalogo", label: "Catálogo", icon: "catalog" },
        { href: "/r/meus-produtos", label: "Meus produtos", icon: "heart" },
        { href: "/r/pedidos", label: "Pedidos", icon: "orders" },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { href: "/r/carteira", label: "Carteira", icon: "wallet" },
        { href: "/r/calculadora", label: "Calculadora de preço", icon: "calculator" },
        { href: "/r/devolucoes", label: "Devoluções", icon: "returns" },
      ],
    },
    {
      label: "Fornecedor",
      items: [
        { href: "/r/mensagens", label: "Falar com fornecedor", icon: "messages", badge: c.unreadMsgs },
        { href: "/r/noticias", label: "Notícias", icon: "news", badge: c.news },
      ],
    },
    { items: [{ href: "/r/configuracoes", label: "Configurações", icon: "settings" }] },
  ];
  const mobile: NavItem[] = [
    { href: "/r", label: "Início", icon: "home", exact: true },
    { href: "/r/catalogo", label: "Catálogo", icon: "catalog" },
    { href: "/r/pedidos", label: "Pedidos", icon: "orders" },
    { href: "/r/carteira", label: "Carteira", icon: "wallet" },
  ];
  const banner = (
    <Link href="/r/carteira" className="flex items-center justify-center gap-2 border-t border-zinc-100 bg-zinc-50/80 px-4 py-1.5 text-[13px] lg:hidden">
      <span className="text-zinc-500">Saldo</span>
      <span className={reseller.balance > 0 ? "font-semibold text-zinc-900" : "font-semibold text-amber-600"}>{brl(reseller.balance)}</span>
    </Link>
  );

  return (
    <div style={{ ["--brand" as string]: color, ["--brand-fg" as string]: contrastText(color) }}>
      <AppShell
        brandName={supplier.name}
        brandSub="Portal do revendedor"
        logoUrl={supplier.logoUrl}
        groups={groups}
        mobile={mobile}
        user={{ name: user.name, email: user.email }}
        notificationsHref="/r/notificacoes"
        unread={c.unread}
        banner={banner}
      >
        {children}
      </AppShell>
    </div>
  );
}
