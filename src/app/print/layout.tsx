export const dynamic = "force-dynamic";

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-zinc-100 print:bg-white">{children}</div>;
}
