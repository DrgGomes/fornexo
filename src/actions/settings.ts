"use server";

import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, suppliers, users } from "@/db";
import { fail, run } from "@/lib/action";
import { checkPassword, getCurrentUser, hashPassword, requireSupplier } from "@/lib/auth";
import { normalizeImageUrl } from "@/lib/images";
import { slugify } from "@/lib/utils";

const opt = z.string().trim().max(500).optional().nullable();

const sections = {
  store: z.object({ name: z.string().trim().min(2, "Informe o nome"), document: opt, email: z.string().trim().email("E-mail inválido"), phone: opt, whatsapp: opt, city: opt, state: opt }),
  showcase: z.object({
    slug: z.string().trim().min(2, "Endereço muito curto").max(48),
    logoUrl: opt,
    bannerUrl: opt,
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
    description: z.string().trim().max(2000).optional().nullable(),
    showcasePublic: z.boolean(),
    showcaseShowPrices: z.boolean(),
  }),
  rules: z.object({
    handlingFee: z.number().int().min(0).max(100000),
    autoApproveResellers: z.boolean(),
    requireLabel: z.boolean(),
    shippingDeadline: opt,
  }),
  payment: z.object({ pixKey: opt, pixHolder: opt, pixCity: opt }),
};

export type SettingsSection = keyof typeof sections;

export async function updateSupplierSettings(section: SettingsSection, data: unknown) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const schema = sections[section];
    if (!schema) fail("Seção inválida.");
    const parsed = schema.parse(data) as Record<string, unknown>;
    if (section === "showcase") {
      const slug = slugify(String(parsed.slug));
      if (slug.length < 2) fail("Endereço inválido.");
      const taken = await db.query.suppliers.findFirst({ where: and(eq(suppliers.slug, slug), ne(suppliers.id, supplier.id)), columns: { id: true } });
      if (taken) fail("Este endereço de vitrine já está em uso.");
      parsed.slug = slug;
      parsed.logoUrl = parsed.logoUrl ? normalizeImageUrl(String(parsed.logoUrl)) : null;
      parsed.bannerUrl = parsed.bannerUrl ? normalizeImageUrl(String(parsed.bannerUrl)) : null;
    }
    for (const k of Object.keys(parsed)) if (parsed[k] === "") parsed[k] = null;
    await db.update(suppliers).set(parsed).where(eq(suppliers.id, supplier.id));
  }, "Configurações salvas");
}

export async function addTeamMember(input: { name: string; email: string; password: string }) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const d = z
      .object({ name: z.string().trim().min(2, "Informe o nome"), email: z.string().trim().toLowerCase().email("E-mail inválido"), password: z.string().min(6, "Senha com ao menos 6 caracteres") })
      .parse(input);
    const exists = await db.query.users.findFirst({ where: eq(users.email, d.email), columns: { id: true } });
    if (exists) fail("Já existe uma conta com este e-mail.");
    await db.insert(users).values({ name: d.name, email: d.email, passwordHash: await hashPassword(d.password), role: "SUPPLIER", supplierId: supplier.id });
  }, "Membro adicionado");
}

export async function setTeamMemberActive(id: string, active: boolean) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    if (id === user.id) fail("Você não pode desativar a si mesmo.");
    await db.update(users).set({ active }).where(and(eq(users.id, id), eq(users.supplierId, supplier.id)));
  }, active ? "Acesso reativado" : "Acesso desativado");
}

export async function changePassword(current: string, next: string) {
  return run(async () => {
    const user = await getCurrentUser();
    if (!user) fail("Sessão expirada.");
    if (!(await checkPassword(current, user.passwordHash))) fail("Senha atual incorreta.");
    if (next.length < 6) fail("A nova senha precisa de ao menos 6 caracteres.");
    await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
  }, "Senha alterada");
}

export async function updateProfile(input: { name: string; phone?: string }) {
  return run(async () => {
    const user = await getCurrentUser();
    if (!user) fail("Sessão expirada.");
    const name = z.string().trim().min(2, "Informe o nome").max(120).parse(input.name);
    await db.update(users).set({ name, phone: input.phone?.trim() || null }).where(eq(users.id, user.id));
  }, "Perfil atualizado");
}
