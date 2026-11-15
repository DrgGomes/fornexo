import Link from "next/link";
import { AppShell, type NavGroup, type NavItem } from "@/components/shell/app-shell";
import { requireSupplier } from "@/lib/auth";
import { supplierCounts } from "@/lib/counts";
import { contrastText, safeColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { user, supplier, access } = await requireSupplier();
  const c = await supplierCounts(supplier.id);
  const color = safeColor(supplier.primaryColor);

  const groups: NavGroup[] = [
    {
      items: [
        { href: "/f", label: "Início", icon: "dashboard", exact: true },
        { href: "/f/pedidos", label: "Pedidos", icon: "orders", badge: c.toProcess },
        { href: "/f/bipagem", label: "Bipagem", icon: "scan" },
      ],
    },
    {
      label: "Catálogo",
      items: [
        { href: "/f/produtos", label: "Produtos", icon: "products" },
        { href: "/f/estoque", label: "Estoque", icon: "stock" },
      ],
    },
    {
      label: "Revendedores",
      items: [
        { href: "/f/revendedores", label: "Revendedores", icon: "resellers", badge: c.pendingResellers },
        { href: "/f/financeiro", label: "Financeiro", icon: "finance", badge: c.pendingDeposits },
        { href: "/f/devolucoes", label: "Devoluções", icon: "returns", badge: c.pendingReturns },
        { href: "/f/mensagens", label: "Mensagens", icon: "messages", badge: c.unreadMsgs },
        { href: "/f/noticias", label: "Notícias", icon: "news" },
      ],
    },
    { items: [{ href: "/f/configuracoes", label: "Configurações", icon: "settings" }] },
  ];
  const mobile: NavItem[] = [
    { href: "/f", label: "Início", icon: "dashboard", exact: true },
    { href: "/f/pedidos", label: "Pedidos", icon: "orders", badge: c.toProcess },
    { href: "/f/bipagem", label: "Bipar", icon: "scan" },
    { href: "/f/produtos", label: "Produtos", icon: "products" },
  ];

  const banner =
    supplier.status === "TRIAL" && access.daysLeft !== undefined ? (
      <div className="bg-zinc-900 px-4 py-2 text-center text-[13px] text-zinc-200">
        Período de teste: {access.daysLeft} {access.daysLeft === 1 ? "dia restante" : "dias restantes"}.{" "}
        <Link href="/f/configuracoes?tab=plano" className="font-medium text-white underline underline-offset-4">
          Ver plano
        </Link>
      </div>
    ) : null;

  return (
    <div style={{ ["--brand" as string]: color, ["--brand-fg" as string]: contrastText(color) }}>
      <AppShell
        brandName={supplier.name}
        brandSub="Painel do fornecedor"
        logoUrl={supplier.logoUrl}
        groups={groups}
        mobile={mobile}
        user={{ name: user.name, email: user.email }}
        notificationsHref="/f/notificacoes"
        unread={c.unread}
        banner={banner}
        externalLink={{ href: `/v/${supplier.slug}`, label: "Ver minha vitrine" }}
      >
        {children}
      </AppShell>
    </div>
  );
}
