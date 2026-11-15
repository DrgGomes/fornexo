import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-card";
import { SignupSupplierForm } from "@/components/auth/signup-supplier-form";
import { TRIAL_DAYS } from "@/lib/constants";

export const metadata = { title: "Criar conta de fornecedor" };

export default function SignupPage() {
  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Crie sua conta de fornecedor</h1>
      <p className="mt-1.5 mb-7 text-sm text-zinc-500">{TRIAL_DAYS} dias grátis. Sem cartão de crédito.</p>
      <SignupSupplierForm />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-zinc-900 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
