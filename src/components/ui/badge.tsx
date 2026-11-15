import type { Tone } from "@/lib/constants";
import { cn } from "@/lib/utils";

const tones: Record<Tone, string> = {
  zinc: "bg-zinc-100 text-zinc-700 ring-zinc-500/15",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  cyan: "bg-cyan-50 text-cyan-800 ring-cyan-600/20",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  green: "bg-green-50 text-green-700 ring-green-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
};

const dots: Record<Tone, string> = {
  zinc: "bg-zinc-400",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  indigo: "bg-indigo-500",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  green: "bg-green-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
};

export function Badge({
  tone = "zinc",
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

export function toneDot(tone: Tone) {
  return dots[tone];
}
