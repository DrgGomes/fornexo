import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-card";
import { SetupForm } from "@/components/auth/setup-form";
import { db, users } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configuração inicial" };

export default async function SetupPage() {
  const [{ n }] = await db.select({ n: count() }).from(users).where(eq(users.role, "ADMIN"));
  if (n > 0) redirect("/entrar");
  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Configuração inicial</h1>
      <p className="mt-1.5 mb-7 text-sm text-zinc-500">Crie a conta de administrador da plataforma. Esta página some depois disso.</p>
      <SetupForm />
    </AuthLayout>
  );
}
