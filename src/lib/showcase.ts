import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, suppliers } from "@/db";
import { supplierAccess } from "./auth";

export const getShowcaseSupplier = cache(async (slug: string) => {
  const s = await db.query.suppliers.findFirst({ where: eq(suppliers.slug, slug) });
  if (!s || !supplierAccess(s).ok) return null;
  return s;
});
