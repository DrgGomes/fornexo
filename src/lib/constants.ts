import type { OrderStatus, ReturnStatus } from "@/db/schema";

export type Tone = "zinc" | "amber" | "blue" | "violet" | "indigo" | "cyan" | "emerald" | "green" | "red" | "orange";

export const ORDER_STATUS: Record<OrderStatus, { label: string; short: string; tone: Tone; hint: string }> = {
  AWAITING_PAYMENT: { label: "Aguardando pagamento", short: "Aguardando", tone: "amber", hint: "Adicione saldo para o pedido ser confirmado" },
  CONFIRMED: { label: "Pedido confirmado", short: "Confirmado", tone: "blue", hint: "Pagamento ok, entrando na fila" },
  PICKING: { label: "Em separação", short: "Separando", tone: "violet", hint: "Estamos separando os itens" },
  PICKED: { label: "Separado", short: "Separado", tone: "indigo", hint: "Itens separados" },
  PACKED: { label: "Embalado", short: "Embalado", tone: "cyan", hint: "Pronto para envio" },
  SHIPPED: { label: "Enviado", short: "Enviado", tone: "emerald", hint: "Postado com a etiqueta" },
  DELIVERED: { label: "Entregue", short: "Entregue", tone: "green", hint: "Entregue ao cliente" },
  CANCELED: { label: "Cancelado", short: "Cancelado", tone: "red", hint: "Pedido cancelado" },
};

export const ORDER_FLOW: OrderStatus[] = ["CONFIRMED", "PICKING", "PICKED", "PACKED", "SHIPPED", "DELIVERED"];
export const SCAN_STATUSES: OrderStatus[] = ["CONFIRMED", "PICKING", "PICKED", "PACKED", "SHIPPED"];
export const ALL_ORDER_STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];
/** Status em que o revendedor ainda pode cancelar sozinho */
export const RESELLER_CANCELABLE: OrderStatus[] = ["AWAITING_PAYMENT", "CONFIRMED"];
/** Status em que o revendedor ainda pode trocar a etiqueta */
export const LABEL_EDITABLE: OrderStatus[] = ["AWAITING_PAYMENT", "CONFIRMED", "PICKING"];

export const RETURN_STATUS: Record<ReturnStatus, { label: string; tone: Tone }> = {
  REQUESTED: { label: "Solicitada", tone: "amber" },
  APPROVED: { label: "Aprovada", tone: "blue" },
  REJECTED: { label: "Recusada", tone: "red" },
  COMPLETED: { label: "Concluída", tone: "green" },
};

export const RETURN_REASONS = [
  "Cliente desistiu da compra",
  "Produto com defeito",
  "Produto errado enviado",
  "Avaria no transporte",
  "Tamanho ou cor diferente",
  "Não entregue / extraviado",
  "Outro motivo",
];

export const MARKETPLACES = [
  { id: "SHOPEE", label: "Shopee" },
  { id: "MERCADO_LIVRE", label: "Mercado Livre" },
  { id: "TIKTOK", label: "TikTok Shop" },
  { id: "AMAZON", label: "Amazon" },
  { id: "MAGALU", label: "Magalu" },
  { id: "SHEIN", label: "Shein" },
  { id: "AMERICANAS", label: "Americanas" },
  { id: "LOJA_PROPRIA", label: "Loja própria" },
  { id: "OUTRO", label: "Outro" },
] as const;

export function marketplaceLabel(id: string) {
  return MARKETPLACES.find((m) => m.id === id)?.label ?? id;
}

export const TX_LABEL: Record<string, string> = {
  DEPOSIT: "Depósito",
  ORDER_PAYMENT: "Pagamento de pedido",
  REFUND: "Estorno",
  ADJUSTMENT: "Ajuste",
};

export const DEFAULT_FEE_PROFILES = [
  { name: "Shopee", commissionPct: 14, extraPct: 6, fixedFee: 400, fixedFeeThreshold: null, shippingCost: 0 },
  { name: "Mercado Livre Clássico", commissionPct: 12, extraPct: 0, fixedFee: 650, fixedFeeThreshold: 7900, shippingCost: 0 },
  { name: "Mercado Livre Premium", commissionPct: 17, extraPct: 0, fixedFee: 650, fixedFeeThreshold: 7900, shippingCost: 0 },
  { name: "TikTok Shop", commissionPct: 6, extraPct: 6, fixedFee: 200, fixedFeeThreshold: null, shippingCost: 0 },
  { name: "Amazon", commissionPct: 13, extraPct: 0, fixedFee: 0, fixedFeeThreshold: null, shippingCost: 0 },
];

export const TRIAL_DAYS = 14;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_UPLOAD = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export const MAX_LABEL_FILES = 5;
export const MAX_LABELS_TOTAL_BYTES = 4 * 1024 * 1024;
export const MERGE_PDF_URL = "https://www.ilovepdf.com/pt/juntar_pdf";
