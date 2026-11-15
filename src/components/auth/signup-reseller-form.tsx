"use client";

import { useActionState, useState } from "react";
import { signupResellerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { MARKETPLACES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FormError } from "./auth-card";

export function SignupResellerForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(signupResellerAction, undefined);
  const [mkts, setMkts] = useState<string[]>(["SHOPEE"]);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      {mkts.map((m) => (
        <input key={m} type="hidden" name="marketplaces" value={m} />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seu nome">
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label="Nome da sua loja">
          <Input name="storeName" placeholder="Opcional" />
        </Field>
        <Field label="WhatsApp">
          <Input name="phone" required inputMode="tel" placeholder="(11) 99999-9999" />
        </Field>
        <Field label="CPF ou CNPJ">
          <Input name="document" placeholder="Opcional" />
        </Field>
      </div>
      <Field label="Onde você vende">
        <div className="flex flex-wrap gap-1.5">
          {MARKETPLACES.map((m) => {
            const on = mkts.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMkts(on ? mkts.filter((x) => x !== m.id) : [...mkts, m.id])}
                className={cn("h-9 rounded-full px-3.5 text-[13px] font-medium ring-1 transition", on ? "bg-brand text-brand-fg ring-brand" : "bg-white text-zinc-600 ring-zinc-200")}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Crie uma senha" hint="Mínimo 6 caracteres">
        <Input name="password" type="password" required autoComplete="new-password" />
      </Field>
      <FormError error={state?.error} />
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Criar minha conta de revendedor
      </Button>
    </form>
  );
}
