"use client";

import { useActionState } from "react";
import { setupAdminAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormError } from "./auth-card";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAdminAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Seu nome">
        <Input name="name" required />
      </Field>
      <Field label="E-mail do administrador">
        <Input name="email" type="email" required />
      </Field>
      <Field label="Senha" hint="Mínimo 6 caracteres">
        <Input name="password" type="password" required autoComplete="new-password" />
      </Field>
      <label className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3.5 text-sm ring-1 ring-zinc-200">
        <input type="checkbox" name="demo" defaultChecked className="mt-0.5 size-4 accent-zinc-900" />
        <span>
          <span className="font-medium">Criar dados de demonstração</span>
          <span className="block text-zinc-500">Fornecedor e revendedor de exemplo para apresentar o sistema a clientes.</span>
        </span>
      </label>
      <FormError error={state?.error} />
      <Button type="submit" variant="dark" size="lg" loading={pending} className="w-full">
        Concluir configuração
      </Button>
    </form>
  );
}
