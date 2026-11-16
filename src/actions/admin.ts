"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, suppliers, users } from "@/db";
import { fail, run } from "@/lib/action";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/constants";
import { seedDemo } from "@/lib/seed";
import { slugify } from "@/lib/utils";
import { forgetDomain } from "@/lib/domain-lookup";
import { domainsConfigured, removeDomain } from "@/lib/vercel-domains";

export async function adminUpdateSupplier(
  id: string,
  input: { status: "TRIAL" | "ACTIVE" | "BLOCKED"; plan: string; trialEndsAt: string | null; paidUntil: string | null; adminNotes: string; importerEnabled: boolean; customDomainEnabled: boolean },
) {
  return run(async () => {
    await requireAdmin();
    const d = z
      .object({
        status: z.enum(["TRIAL", "ACTIVE", "BLOCKED"]),
        plan: z.string().trim().min(1).max(40),
        trialEndsAt: z.string().nullable(),
        paidUntil: z.string().nullable(),
        adminNotes: z.string().max(5000),
        importerEnabled: z.boolean(),
        customDomainEnabled: z.boolean(),
      })
      .parse(input);
    const toDate = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59-03:00`) : null);
    await db
      .update(suppliers)
      .set({
        status: d.status,
        plan: d.plan,
        trialEndsAt: toDate(d.trialEndsAt),
        paidUntil: toDate(d.paidUntil),
        adminNotes: d.adminNotes || null,
        importerEnabled: d.importerEnabled,
        customDomainEnabled: d.customDomainEnabled,
        // ao desligar, invalida a conexao da extensao
        ...(d.importerEnabled ? {} : { importTokenHash: null, importTokenCreatedAt: null }),
      })
      .where(eq(suppliers.id, id));
    if (!d.customDomainEnabled) {
      const [row] = await db.select({ customDomain: suppliers.customDomain }).from(suppliers).where(eq(suppliers.id, id));
      if (row?.customDomain) {
        if (domainsConfigured()) await removeDomain(row.customDomain);
        forgetDomain(row.customDomain);
        await db.update(suppliers).set({ customDomain: null, customDomainStatus: null }).where(eq(suppliers.id, id));
      }
    }
  }, "Fornecedor atualizado");
}

export async function adminCreateSupplier(input: { company: string; name: string; email: string; password: string }) {
  return run(async () => {
    await requireAdmin();
    const d = z
      .object({
        company: z.string().trim().min(2, "Informe a empresa"),
        name: z.string().trim().min(2, "Informe o responsável"),
        email: z.string().trim().toLowerCase().email("E-mail inválido"),
        password: z.string().min(6, "Senha com ao menos 6 caracteres"),
      })
      .parse(input);
    const exists = await db.query.users.findFirst({ where: eq(users.email, d.email), columns: { id: true } });
    if (exists) fail("E-mail já cadastrado.");
    let slug = slugify(d.company) || "loja";
    for (let i = 2; await db.query.suppliers.findFirst({ where: eq(suppliers.slug, slug), columns: { id: true } }); i++) slug = `${slugify(d.company)}-${i}`;
    const passwordHash = await hashPassword(d.password);
    return db.transaction(async (tx) => {
      const [s] = await tx
        .insert(suppliers)
        .values({ name: d.company, slug, email: d.email, status: "TRIAL", trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000) })
        .returning();
      await tx.insert(users).values({ name: d.name, email: d.email, passwordHash, role: "SUPPLIER", supplierId: s.id });
      return { id: s.id };
    });
  }, "Fornecedor criado");
}

export async function adminSeedDemo() {
  return run(async () => {
    await requireAdmin();
    await seedDemo();
  }, "Dados de demonstração criados (fornecedor@demo.com / revendedor@demo.com, senha demo1234)");
}
