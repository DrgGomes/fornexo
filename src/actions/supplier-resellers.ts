"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, feeProfiles, resellers, users } from "@/db";
import { fail, run } from "@/lib/action";
import { hashPassword, requireSupplier } from "@/lib/auth";
import { DEFAULT_FEE_PROFILES } from "@/lib/constants";
import { brl } from "@/lib/format";
import { notify } from "@/lib/notify";
import { applyWallet, payPendingOrders } from "@/lib/wallet";

async function owned(id: string, supplierId: string) {
  const r = await db.query.resellers.findFirst({ where: and(eq(resellers.id, id), eq(resellers.supplierId, supplierId)) });
  if (!r) fail("Revendedor não encontrado.");
  return r;
}

export async function setResellerStatus(id: string, status: "ACTIVE" | "BLOCKED" | "PENDING") {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const r = await owned(id, supplier.id);
    await db.update(resellers).set({ status }).where(eq(resellers.id, r.id));
    if (status === "ACTIVE" && r.status !== "ACTIVE") {
      await notify({ supplierId: supplier.id, resellerId: r.id, toSupplier: false, title: "Seu acesso foi liberado", body: "Bem-vindo! Já pode escolher produtos e fazer pedidos.", href: "/r" });
    }
  }, status === "ACTIVE" ? "Revendedor ativo" : status === "BLOCKED" ? "Revendedor bloqueado" : "Status atualizado");
}

export async function adjustBalance(id: string, amount: number, description: string) {
  return run(async () => {
    const { supplier, user } = await requireSupplier();
    const r = await owned(id, supplier.id);
    const amt = z.number().int().refine((v) => v !== 0, "Informe o valor").parse(amount);
    const desc = description.trim().slice(0, 200) || (amt > 0 ? "Crédito manual" : "Débito manual");
    const paid = await db.transaction(async (tx) => {
      await applyWallet(tx, { supplierId: supplier.id, resellerId: r.id, type: "ADJUSTMENT", amount: amt, description: desc, createdBy: user.name });
      await notify(
        { supplierId: supplier.id, resellerId: r.id, toSupplier: false, title: amt > 0 ? `Crédito de ${brl(amt)} no seu saldo` : `Débito de ${brl(-amt)} no seu saldo`, body: desc, href: "/r/carteira" },
        tx,
      );
      return amt > 0 ? payPendingOrders(tx, supplier.id, r.id) : 0;
    });
    return { paid };
  }, "Saldo ajustado");
}

export async function saveResellerNotes(id: string, notes: string) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const r = await owned(id, supplier.id);
    await db.update(resellers).set({ notes: notes.slice(0, 5000) || null }).where(eq(resellers.id, r.id));
  }, "Anotações salvas");
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  storeName: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: z.string().trim().optional(),
  password: z.string().min(6, "Senha com ao menos 6 caracteres"),
});

export async function createResellerManually(input: z.infer<typeof createSchema>) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const d = createSchema.parse(input);
    const exists = await db.query.users.findFirst({ where: eq(users.email, d.email), columns: { id: true } });
    if (exists) fail("Já existe uma conta com este e-mail.");
    const passwordHash = await hashPassword(d.password);
    return db.transaction(async (tx) => {
      const [r] = await tx
        .insert(resellers)
        .values({ supplierId: supplier.id, name: d.name, storeName: d.storeName || null, phone: d.phone || null, status: "ACTIVE" })
        .returning();
      await tx.insert(feeProfiles).values(DEFAULT_FEE_PROFILES.map((f, i) => ({ ...f, resellerId: r.id, position: i })));
      await tx.insert(users).values({ name: d.name, email: d.email, passwordHash, role: "RESELLER", resellerId: r.id, phone: d.phone || null });
      return { id: r.id };
    });
  }, "Revendedor cadastrado");
}
