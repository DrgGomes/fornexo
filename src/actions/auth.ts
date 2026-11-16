"use server";

import { count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, feeProfiles, resellers, suppliers, users } from "@/db";
import { checkPassword, endSession, hashPassword, startSession, supplierAccess } from "@/lib/auth";
import { DEFAULT_FEE_PROFILES, TRIAL_DAYS } from "@/lib/constants";
import { notify } from "@/lib/notify";
import { homeFor } from "@/lib/session-token";
import { slugify } from "@/lib/utils";
import { attemptsSince, clearAttempts, clientIp, recordAttempt } from "@/lib/rate-limit";
import { seedDemo } from "@/lib/seed";

export type FormState = { error?: string; ok?: boolean; message?: string } | undefined;

const email = z.string().trim().toLowerCase().email("E-mail inválido");
const password = z.string().min(6, "A senha precisa de ao menos 6 caracteres");

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ email, password: z.string().min(1, "Informe a senha") }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const ip = await clientIp();
  const emailKey = `login:${parsed.data.email}`;
  const ipKey = `login-ip:${ip}`;
  const [byEmail, byIp] = await Promise.all([attemptsSince(emailKey, 15), attemptsSince(ipKey, 15)]);
  if (byEmail >= 8 || byIp >= 40) return { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };
  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (!user || !(await checkPassword(parsed.data.password, user.passwordHash))) {
    await recordAttempt(emailKey, ipKey);
    return { error: "E-mail ou senha incorretos." };
  }
  if (!user.active) return { error: "Usuário desativado. Fale com o responsável pela conta." };
  await clearAttempts(emailKey);
  await startSession(user);
  const next = String(form.get("next") || "");
  const safe = /^\/(?![\/\\])/.test(next) ? next : null;
  redirect(safe ?? homeFor(user.role));
}

export async function logoutAction() {
  await endSession();
  redirect("/entrar");
}

async function uniqueSlug(base: string) {
  const root = slugify(base) || "loja";
  let slug = root;
  for (let i = 2; i < 200; i++) {
    const exists = await db.query.suppliers.findFirst({ where: eq(suppliers.slug, slug), columns: { id: true } });
    if (!exists) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function signupSupplierAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      company: z.string().trim().min(2, "Informe o nome da empresa"),
      name: z.string().trim().min(2, "Informe seu nome"),
      email,
      phone: z.string().trim().min(8, "Informe um WhatsApp válido"),
      password,
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const ipKey = `signup:${await clientIp()}`;
  if ((await attemptsSince(ipKey, 60)) >= 10) return { error: "Muitos cadastros a partir desta conexão. Tente mais tarde." };
  const exists = await db.query.users.findFirst({ where: eq(users.email, d.email), columns: { id: true } });
  if (exists) return { error: "Já existe uma conta com este e-mail." };
  await recordAttempt(ipKey);
  const slug = await uniqueSlug(d.company);
  const passwordHash = await hashPassword(d.password);
  const user = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(suppliers)
      .values({
        name: d.company,
        slug,
        email: d.email,
        phone: d.phone,
        whatsapp: d.phone,
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000),
      })
      .returning();
    const [u] = await tx
      .insert(users)
      .values({ name: d.name, email: d.email, passwordHash, role: "SUPPLIER", supplierId: s.id, phone: d.phone })
      .returning();
    return u;
  });
  await startSession(user);
  redirect("/f?bemvindo=1");
}

export async function signupResellerAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      slug: z.string().min(1),
      name: z.string().trim().min(2, "Informe seu nome"),
      storeName: z.string().trim().optional(),
      email,
      phone: z.string().trim().min(8, "Informe um WhatsApp válido"),
      document: z.string().trim().optional(),
      password,
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const ipKey = `signup:${await clientIp()}`;
  if ((await attemptsSince(ipKey, 60)) >= 10) return { error: "Muitos cadastros a partir desta conexão. Tente mais tarde." };
  await recordAttempt(ipKey);
  const supplier = await db.query.suppliers.findFirst({ where: eq(suppliers.slug, d.slug) });
  if (!supplier || !supplierAccess(supplier).ok) return { error: "Fornecedor indisponível no momento." };
  const exists = await db.query.users.findFirst({ where: eq(users.email, d.email), columns: { id: true } });
  if (exists) return { error: "Já existe uma conta com este e-mail. Use outro e-mail ou faça login." };
  const marketplaces = form.getAll("marketplaces").map(String).slice(0, 12);
  const passwordHash = await hashPassword(d.password);
  const status = supplier.autoApproveResellers ? "ACTIVE" : "PENDING";
  const user = await db.transaction(async (tx) => {
    const [r] = await tx
      .insert(resellers)
      .values({
        supplierId: supplier.id,
        name: d.name,
        storeName: d.storeName || null,
        phone: d.phone,
        document: d.document || null,
        marketplaces,
        status,
      })
      .returning();
    await tx.insert(feeProfiles).values(DEFAULT_FEE_PROFILES.map((f, i) => ({ ...f, resellerId: r.id, position: i })));
    const [u] = await tx
      .insert(users)
      .values({ name: d.name, email: d.email, passwordHash, role: "RESELLER", resellerId: r.id, phone: d.phone })
      .returning();
    await notify(
      {
        supplierId: supplier.id,
        toSupplier: true,
        title: status === "PENDING" ? `Novo revendedor aguardando aprovação` : `Novo revendedor cadastrado`,
        body: `${d.name}${d.storeName ? ` (${d.storeName})` : ""}`,
        href: `/f/revendedores/${r.id}`,
      },
      tx,
    );
    return u;
  });
  await startSession(user);
  redirect(status === "ACTIVE" ? "/r?bemvindo=1" : "/aguardando");
}

export async function setupAdminAction(_: FormState, form: FormData): Promise<FormState> {
  const [{ n }] = await db.select({ n: count() }).from(users).where(eq(users.role, "ADMIN"));
  if (n > 0) return { error: "O administrador já foi configurado." };
  const parsed = z.object({ name: z.string().trim().min(2, "Informe seu nome"), email, password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const passwordHash = await hashPassword(parsed.data.password);
  const [u] = await db
    .insert(users)
    .values({ name: parsed.data.name, email: parsed.data.email, passwordHash, role: "ADMIN" })
    .returning();
  if (form.get("demo") === "on") await seedDemo();
  await startSession(u);
  redirect("/admin");
}
