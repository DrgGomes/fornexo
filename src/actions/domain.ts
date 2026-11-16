"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, suppliers } from "@/db";
import { fail, run } from "@/lib/action";
import { requireSupplier } from "@/lib/auth";
import { forgetDomain } from "@/lib/domain-lookup";
import { addDomain, checkDomain, DOMAIN_RE, domainsConfigured, normalizeDomain, removeDomain } from "@/lib/vercel-domains";

const BLOCKED = /(^|\.)(fornexo\.com\.br|vercel\.app|vercel\.com|localhost)$/;

async function owner() {
  const ctx = await requireSupplier();
  if (!ctx.supplier.customDomainEnabled) fail("Domínio próprio não está liberado no seu plano. Fale com o suporte.");
  if (!domainsConfigured()) fail("Recurso em configuração pela plataforma. Tente novamente mais tarde.");
  return ctx;
}

export async function connectDomain(raw: string) {
  return run(async () => {
    const { supplier } = await owner();
    const name = normalizeDomain(raw);
    if (!DOMAIN_RE.test(name)) fail("Digite um domínio válido, ex: revenda.sualoja.com.br");
    if (BLOCKED.test(name)) fail("Use um domínio seu.");
    const taken = await db.query.suppliers.findFirst({ where: and(eq(suppliers.customDomain, name), ne(suppliers.id, supplier.id)), columns: { id: true } });
    if (taken) fail("Esse domínio já está em uso por outra conta.");
    if (supplier.customDomain && supplier.customDomain !== name) {
      await removeDomain(supplier.customDomain);
      forgetDomain(supplier.customDomain);
    }
    const r = await addDomain(name);
    if (!r.ok) fail(r.error);
    await db.update(suppliers).set({ customDomain: name, customDomainStatus: "PENDING", customDomainApex: r.apex }).where(eq(suppliers.id, supplier.id));
    forgetDomain(name);
    revalidatePath("/f/configuracoes");
  }, "Domínio adicionado. Agora configure o DNS.");
}

export async function verifyDomain() {
  return run(async () => {
    const { supplier } = await owner();
    if (!supplier.customDomain) fail("Nenhum domínio conectado.");
    const c = await checkDomain(supplier.customDomain);
    if (!c) fail("Não consegui consultar o domínio agora. Tente em instantes.");
    const active = c.verified && c.configured;
    await db.update(suppliers).set({ customDomainStatus: active ? "ACTIVE" : "PENDING", customDomainApex: c.apex }).where(eq(suppliers.id, supplier.id));
    forgetDomain(supplier.customDomain);
    revalidatePath("/f/configuracoes");
    if (!active) fail("O DNS ainda não está apontando. Pode levar até 2 horas depois de salvar. Confira os registros abaixo.");
  }, "Domínio ativo!");
}

export async function disconnectDomain() {
  return run(async () => {
    const { supplier } = await requireSupplier();
    if (supplier.customDomain && domainsConfigured()) await removeDomain(supplier.customDomain);
    forgetDomain(supplier.customDomain);
    await db.update(suppliers).set({ customDomain: null, customDomainStatus: null, customDomainApex: false }).where(eq(suppliers.id, supplier.id));
    revalidatePath("/f/configuracoes");
  }, "Domínio removido");
}
