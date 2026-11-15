import Link from "next/link";
import { notFound } from "next/navigation";
import { SignupResellerForm } from "@/components/auth/signup-reseller-form";
import { getShowcaseSupplier } from "@/lib/showcase";

export const metadata = { title: "Cadastro de revendedor" };

export default async function ResellerSignupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getShowcaseSupplier(slug);
  if (!s) notFound();
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <h1 className="text-2xl font-semibold tracking-tight">Seja revendedor {s.name}</h1>
      <p className="mt-1.5 mb-7 text-sm text-zinc-500">
        {s.autoApproveResellers ? "Seu acesso é liberado na hora." : "Após o cadastro, o fornecedor aprova seu acesso."}
      </p>
      <SignupResellerForm slug={s.slug} />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-zinc-900 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
