import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/session-token";
import { domainBrand } from "@/lib/domain-brand";

export async function generateMetadata() {
  const b = await domainBrand();
  return b ? { title: { absolute: `Entrar | ${b.name}` }, applicationName: b.name } : { title: "Entrar" };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { next } = await searchParams;
  const brand = await domainBrand();
  if (brand) {
    return (
      <AuthLayout brand={brand}>
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-1.5 mb-7 text-sm text-zinc-500">Acesse seu portal de revendedor {brand.name}.</p>
        <LoginForm next={next} />
        <p className="mt-6 text-center text-sm text-zinc-500">
          Ainda não é revendedor?{" "}
          <Link href="/cadastro#cadastro" className="font-medium text-zinc-900 underline-offset-4 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
      <p className="mt-1.5 mb-7 text-sm text-zinc-500">Acesse o painel do fornecedor ou o portal do revendedor.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-zinc-500">
        É fornecedor e ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-zinc-900 underline-offset-4 hover:underline">
          Teste grátis
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-zinc-400">Revendedor: peça o link de cadastro ao seu fornecedor.</p>
    </AuthLayout>
  );
}
