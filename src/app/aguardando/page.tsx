import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { db, resellers, suppliers } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { whatsappLink } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user?.resellerId) redirect("/entrar");
  const r = await db.query.resellers.findFirst({ where: eq(resellers.id, user.resellerId) });
  if (!r) redirect("/entrar");
  if (r.status === "ACTIVE") redirect("/r");
  const s = await db.query.suppliers.findFirst({ where: eq(suppliers.id, r.supplierId) });
  const wa = whatsappLink(s?.whatsapp, `Olá! Acabei de me cadastrar no portal (${user.email}) e aguardo aprovação.`);
  const blocked = r.status === "BLOCKED";
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Clock className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{blocked ? "Acesso bloqueado" : "Cadastro em análise"}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {blocked
            ? `Seu acesso ao portal de ${s?.name} foi bloqueado. Fale com o fornecedor.`
            : `Recebemos seu cadastro. ${s?.name} vai analisar e liberar seu acesso em breve.`}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white">
              Falar no WhatsApp
            </a>
          )}
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" className="w-full">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
