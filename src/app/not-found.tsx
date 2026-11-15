import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <p className="font-mono text-sm text-zinc-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Página não encontrada</h1>
      <p className="mt-2 text-sm text-zinc-500">O endereço pode ter mudado ou o conteúdo não está mais disponível.</p>
      <Link href="/" className={buttonClass("dark", "md", "mt-6")}>
        Voltar ao início
      </Link>
    </div>
  );
}
