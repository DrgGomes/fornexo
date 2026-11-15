import Link from "next/link";

export function AuthLayout({ children, side }: { children: React.ReactNode; side?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">F</span>
          <span className="text-[15px] font-semibold tracking-tight">Fornexo</span>
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </div>
      <div className="relative hidden overflow-hidden bg-zinc-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(99,102,241,0.45),transparent),radial-gradient(50%_40%_at_20%_90%,rgba(16,185,129,0.25),transparent)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">{side ?? <DefaultSide />}</div>
      </div>
    </div>
  );
}

function DefaultSide() {
  return (
    <div className="max-w-md">
      <p className="text-sm font-medium text-indigo-300">Dropshipping sem planilha</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Produtos, pedidos, etiquetas e financeiro no mesmo lugar.</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
        O fornecedor bipa o pedido e o revendedor vê o status na hora. Fotos, títulos e descrições prontos para anunciar.
      </p>
    </div>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">{error}</div>;
}
