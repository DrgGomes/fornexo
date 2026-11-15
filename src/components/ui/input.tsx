import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full rounded-xl bg-white px-3.5 text-[15px] sm:text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 transition focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-zinc-50 disabled:text-zinc-500";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-11 sm:h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        fieldBase,
        "h-11 sm:h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%2371717a%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-zinc-700", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
  aside,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || aside) && (
        <div className="flex items-center justify-between gap-2">
          {label && <Label htmlFor={htmlFor}>{label}</Label>}
          {aside && <span className="text-xs text-zinc-400">{aside}</span>}
        </div>
      )}
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
