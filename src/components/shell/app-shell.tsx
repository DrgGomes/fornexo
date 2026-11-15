"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Ellipsis, ExternalLink, LogOut, X } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { ICONS, type IconKey } from "./icons";

export type NavItem = { href: string; label: string; icon: IconKey; badge?: number; exact?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };

export function AppShell({
  brandName,
  brandSub,
  logoUrl,
  groups,
  mobile,
  user,
  notificationsHref,
  unread,
  banner,
  externalLink,
  children,
}: {
  brandName: string;
  brandSub?: string;
  logoUrl?: string | null;
  groups: NavGroup[];
  mobile: NavItem[];
  user: { name: string; email: string };
  notificationsHref: string;
  unread: number;
  banner?: React.ReactNode;
  externalLink?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const Logo = (
    <div className="flex min-w-0 items-center gap-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={brandName} className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-zinc-200" />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-fg">
          {brandName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[14px] font-semibold tracking-tight">{brandName}</p>
        {brandSub && <p className="truncate text-[11px] text-zinc-500">{brandSub}</p>}
      </div>
    </div>
  );

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-5">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">{g.label}</p>}
          <div className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition",
                    active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                >
                  <Icon className={cn("size-[18px]", active ? "text-white" : "text-zinc-400 group-hover:text-zinc-700")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {!!item.badge && (
                    <span
                      className={cn(
                        "min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums",
                        active ? "bg-white/20 text-white" : "bg-brand text-brand-fg",
                      )}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-zinc-200/70 bg-white lg:flex">
        <div className="flex h-16 items-center px-5">{Logo}</div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavList />
        </div>
        {externalLink && (
          <a
            href={externalLink.href}
            target="_blank"
            rel="noreferrer"
            className="mx-3 mb-2 flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <ExternalLink className="size-4" /> {externalLink.label}
          </a>
        )}
        <div className="flex items-center gap-3 border-t border-zinc-100 p-4">
          <Avatar name={user.name} size={34} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold">{user.name}</p>
            <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800" aria-label="Sair" title="Sair">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 lg:h-16 lg:px-8">
          <div className="lg:hidden">{Logo}</div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1">
            <Link
              href={notificationsHref}
              className="relative rounded-xl p-2.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Notificações"
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          </div>
        </div>
        {banner}
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-5 pb-28 sm:pt-6 lg:px-8 lg:pb-12">{children}</main>

      {/* Bottom nav mobile */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/70 bg-white/95 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {mobile.slice(0, 4).map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(item);
            return (
              <Link key={item.href} href={item.href} className="relative flex h-16 flex-col items-center justify-center gap-1">
                <span className={cn("relative rounded-full px-4 py-1 transition", active && "bg-zinc-900")}>
                  <Icon className={cn("size-5", active ? "text-white" : "text-zinc-500")} />
                  {!!item.badge && (
                    <span className="absolute -top-1 right-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </span>
                <span className={cn("text-[11px] font-medium", active ? "text-zinc-900" : "text-zinc-500")}>{item.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className="flex h-16 flex-col items-center justify-center gap-1">
            <span className="rounded-full px-4 py-1">
              <Ellipsis className="size-5 text-zinc-500" />
            </span>
            <span className="text-[11px] font-medium text-zinc-500">Mais</span>
          </button>
        </div>
      </nav>

      {/* Sheet "Mais" */}
      {more && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-zinc-950/40" onClick={() => setMore(false)} />
          <div className="animate-sheet pb-safe absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              {Logo}
              <button onClick={() => setMore(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <NavList onNavigate={() => setMore(false)} />
            {externalLink && (
              <a
                href={externalLink.href}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-zinc-600 hover:bg-zinc-100"
              >
                <ExternalLink className="size-[18px] text-zinc-400" /> {externalLink.label}
              </a>
            )}
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-zinc-50 p-3">
              <Avatar name={user.name} size={36} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
              </div>
              <form action={logoutAction}>
                <button className="flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-medium text-zinc-700 ring-1 ring-zinc-200">
                  <LogOut className="size-4" /> Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
