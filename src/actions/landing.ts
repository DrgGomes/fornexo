"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, suppliers } from "@/db";
import { run } from "@/lib/action";
import { requireSupplier } from "@/lib/auth";
import { normalizeImageUrl } from "@/lib/images";
import { landingSchema } from "@/lib/landing";

const brandSchema = z.object({
  logoUrl: z.string().trim().max(1000).default(""),
  bannerUrl: z.string().trim().max(1000).default(""),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  whatsapp: z.string().trim().max(30).default(""),
});

export async function saveLanding(input: { landing: unknown; brand: unknown }) {
  return run(async () => {
    const { supplier } = await requireSupplier();
    const landing = landingSchema.parse(input.landing);
    const brand = brandSchema.parse(input.brand);
    // limpa listas: remove itens vazios
    landing.stats = landing.stats.filter((x) => x.value || x.label);
    landing.benefits = landing.benefits.filter((x) => x.title || x.text);
    landing.steps = landing.steps.filter((x) => x.title || x.text);
    landing.rules = landing.rules.filter(Boolean);
    landing.testimonials = landing.testimonials.filter((x) => x.text);
    landing.faq = landing.faq.filter((x) => x.q);
    await db
      .update(suppliers)
      .set({
        landing,
        logoUrl: brand.logoUrl ? normalizeImageUrl(brand.logoUrl) : null,
        bannerUrl: brand.bannerUrl ? normalizeImageUrl(brand.bannerUrl) : null,
        primaryColor: brand.primaryColor,
        whatsapp: brand.whatsapp || null,
      })
      .where(eq(suppliers.id, supplier.id));
    revalidatePath(`/v/${supplier.slug}`);
  }, "Página publicada");
}

export async function resetLanding() {
  return run(async () => {
    const { supplier } = await requireSupplier();
    await db.update(suppliers).set({ landing: null }).where(eq(suppliers.id, supplier.id));
  }, "Textos padrão restaurados");
}
