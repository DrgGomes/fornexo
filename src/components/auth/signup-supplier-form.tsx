"use client";

import { useActionState } from "react";
import { signupSupplierAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormError } from "./auth-card";

export function SignupSupplierForm() {
  const [state, action, pending] = useActionState(signupSupplierAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Nome da empresa">
        <Input name="company" required placeholder="Ex: Atacado Silva" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seu nome">
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label="WhatsApp">
          <Input name="phone" required inputMode="tel" placeholder="(11) 99999-9999" />
        </Field>
      </div>
      <Field label="E-mail">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Senha" hint="Mínimo 6 caracteres">
        <Input name="password" type="password" required autoComplete="new-password" />
      </Field>
      <FormError error={state?.error} />
      <Button type="submit" variant="dark" size="lg" loading={pending} className="mt-1 w-full">
        Criar conta e começar
      </Button>
    </form>
  );
}
