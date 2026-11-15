import Link from "next/link";
import { forwardRef } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "soft";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:brightness-110 shadow-sm shadow-brand/20",
  dark: "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm",
  secondary: "bg-white text-zinc-800 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50 shadow-xs",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  soft: "bg-brand/10 text-brand hover:bg-brand/15",
  danger: "bg-red-600 text-white hover:bg-red-500 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle className="animate-spin" />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
