import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, feeProfiles } from "@/db";
import type { FeeProfileInput } from "./pricing";
import type { CalcCosts } from "@/components/reseller/price-calculator";

export async function loadPricing(reseller: { id: string; taxPct: number; adsPct: number; packagingCost: number; otherCost: number; targetMarginPct: number }) {
  const rows = await db.select().from(feeProfiles).where(eq(feeProfiles.resellerId, reseller.id)).orderBy(asc(feeProfiles.position));
  const profiles: FeeProfileInput[] = rows.map((f) => ({
    id: f.id,
    name: f.name,
    commissionPct: f.commissionPct,
    extraPct: f.extraPct,
    fixedFee: f.fixedFee,
    fixedFeeThreshold: f.fixedFeeThreshold,
    shippingCost: f.shippingCost,
  }));
  const costs: CalcCosts = {
    taxPct: reseller.taxPct,
    adsPct: reseller.adsPct,
    packagingCost: reseller.packagingCost,
    otherCost: reseller.otherCost,
    targetMarginPct: reseller.targetMarginPct,
  };
  return { profiles, costs };
}
