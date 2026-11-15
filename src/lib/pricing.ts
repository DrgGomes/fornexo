export type FeeProfileInput = {
  id?: string;
  name: string;
  commissionPct: number;
  extraPct: number;
  fixedFee: number;
  fixedFeeThreshold: number | null;
  shippingCost: number;
};

export type CostInput = {
  productCost: number;
  handlingFee: number;
  packagingCost: number;
  otherCost: number;
  taxPct: number;
  adsPct: number;
};

export type PriceBreakdown = {
  price: number;
  commission: number;
  extra: number;
  fixed: number;
  shipping: number;
  tax: number;
  ads: number;
  costs: number;
  profit: number;
  marginPct: number;
};

function fixedApplies(fee: FeeProfileInput, price: number) {
  return !fee.fixedFeeThreshold || price < fee.fixedFeeThreshold;
}

export function analyzePrice(fee: FeeProfileInput, cost: CostInput, price: number): PriceBreakdown {
  const commission = Math.round((price * fee.commissionPct) / 100);
  const extra = Math.round((price * fee.extraPct) / 100);
  const fixed = fixedApplies(fee, price) ? fee.fixedFee : 0;
  const tax = Math.round((price * cost.taxPct) / 100);
  const ads = Math.round((price * cost.adsPct) / 100);
  const costs = cost.productCost + cost.handlingFee + cost.packagingCost + cost.otherCost;
  const shipping = fee.shippingCost;
  const profit = price - commission - extra - fixed - tax - ads - costs - shipping;
  return { price, commission, extra, fixed, shipping, tax, ads, costs, profit, marginPct: price > 0 ? (profit / price) * 100 : 0 };
}

/** Preco minimo de venda que entrega a margem desejada (em % do preco). */
export function suggestPrice(fee: FeeProfileInput, cost: CostInput, marginPct: number): number | null {
  const pctTotal = (fee.commissionPct + fee.extraPct + cost.taxPct + cost.adsPct + marginPct) / 100;
  if (pctTotal >= 0.98) return null;
  const base = cost.productCost + cost.handlingFee + cost.packagingCost + cost.otherCost + fee.shippingCost;
  let price = (base + fee.fixedFee) / (1 - pctTotal);
  if (fee.fixedFeeThreshold && price >= fee.fixedFeeThreshold) {
    const noFixed = base / (1 - pctTotal);
    price = noFixed >= fee.fixedFeeThreshold ? noFixed : fee.fixedFeeThreshold;
  }
  return Math.ceil(price);
}

/** Arredonda para cima terminando em ,90 */
export function charmPrice(cents: number) {
  const reais = Math.floor(cents / 100);
  const candidate = reais * 100 + 90;
  return candidate >= cents ? candidate : candidate + 100;
}
