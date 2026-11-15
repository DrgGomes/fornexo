import { AppShell } from "@/components/shell/app-shell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div style={{ ["--brand" as string]: "#18181b", ["--brand-fg" as string]: "#ffffff" }}>
      <AppShell
        brandName="Fornexo"
        brandSub="Administração"
        groups={[
          {
            items: [
              { href: "/admin", label: "Visão geral", icon: "dashboard", exact: true },
              { href: "/admin/fornecedores", label: "Fornecedores", icon: "suppliers" },
            ],
          },
        ]}
        mobile={[
          { href: "/admin", label: "Início", icon: "dashboard", exact: true },
          { href: "/admin/fornecedores", label: "Fornecedores", icon: "suppliers" },
        ]}
        user={{ name: user.name, email: user.email }}
        notificationsHref="/admin"
        unread={0}
      >
        {children}
      </AppShell>
    </div>
  );
}
