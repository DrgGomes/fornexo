"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormError } from "./auth-card";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com" />
      </Field>
      <Field label="Senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Sua senha" />
      </Field>
      <FormError error={state?.error} />
      <Button type="submit" variant="dark" size="lg" loading={pending} className="mt-1 w-full">
        Entrar
      </Button>
    </form>
  );
}
