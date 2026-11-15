import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-white ring-1 ring-zinc-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)]", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-zinc-900">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
