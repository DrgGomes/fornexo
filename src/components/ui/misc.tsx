import Link from "next/link";
import { SmartImg } from "@/components/ui/smart-img";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ORDER_STATUS, RETURN_STATUS } from "@/lib/constants";
import type { OrderStatus, ReturnStatus } from "@/db/schema";
import { cn, initials } from "@/lib/utils";
import { Badge } from "./badge";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-zinc-500 hover:text-zinc-900">
            <ChevronLeft className="size-4" /> Voltar
          </Link>
        )}
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 [&_svg]:size-6">{icon}</div>}
      <p className="text-[15px] font-semibold text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  href,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "h-full rounded-2xl p-4 ring-1 transition sm:p-5",
        accent ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white ring-zinc-200/70",
        href && "hover:ring-zinc-300 hover:shadow-sm",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[13px] font-medium", accent ? "text-zinc-300" : "text-zinc-500")}>{label}</span>
        {icon && <span className={cn("[&_svg]:size-4", accent ? "text-zinc-400" : "text-zinc-400")}>{icon}</span>}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
      {hint && <div className={cn("mt-1 text-xs", accent ? "text-zinc-400" : "text-zinc-500")}>{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return (
    <Badge tone={s.tone} dot>
      {s.short}
    </Badge>
  );
}

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const s = RETURN_STATUS[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <SmartImg src={src} alt={name} size={size} className={cn("shrink-0 rounded-full object-cover", className)} />;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 font-semibold text-zinc-600", className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

export function TabLinks({ items }: { items: { href: string; label: string; count?: number; active: boolean }[] }) {
  return (
    <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          scroll={false}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition",
            t.active ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:text-zinc-900",
          )}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", t.active ? "bg-white/20" : "bg-zinc-100 text-zinc-600")}>{t.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, makeHref }: { page: number; totalPages: number; makeHref: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-zinc-500">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={makeHref(page - 1)} className="inline-flex h-9 items-center gap-1 rounded-xl bg-white px-3 ring-1 ring-zinc-200 hover:bg-zinc-50">
            <ChevronLeft className="size-4" /> Anterior
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={makeHref(page + 1)} className="inline-flex h-9 items-center gap-1 rounded-xl bg-white px-3 ring-1 ring-zinc-200 hover:bg-zinc-50">
            Próxima <ChevronRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function ProductThumb({ src, alt, size = 48, className }: { src?: string | null; alt: string; size?: number; className?: string }) {
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200/60", className)} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <SmartImg src={src} alt={alt} size={size} className="size-full object-cover" />
      ) : null}
    </div>
  );
}

export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-900">{children}</span>
    </div>
  );
}
