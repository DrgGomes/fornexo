import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { db, resellers, suppliers } from "@/db";
import { getCurrentUser, supplierAccess } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BlockedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  let supplierId = user.supplierId;
  if (user.resellerId) {
    const r = await db.query.resellers.findFirst({ where: eq(resellers.id, user.resellerId) });
    supplierId = r?.supplierId ?? null;
  }
  const s = supplierId ? await db.query.suppliers.findFirst({ where: eq(suppliers.id, supplierId) }) : null;
  const access = s ? supplierAccess(s) : { ok: false, reason: "Conta indisponível." };
  if (s && access.ok) redirect(user.role === "SUPPLIER" ? "/f" : "/r");
  const isSupplier = user.role === "SUPPLIER";
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-zinc-900 text-white">
          <Lock className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{isSupplier ? "Acesso suspenso" : "Portal temporariamente indisponível"}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {isSupplier
            ? `${access.reason} Entre em contato com o suporte da plataforma para regularizar e reativar sua conta.`
            : "O portal deste fornecedor está temporariamente fora do ar. Seus dados estão seguros. Fale com o fornecedor."}
        </p>
        <form action={logoutAction} className="mt-6">
          <Button type="submit" variant="secondary">
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}
