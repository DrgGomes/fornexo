import { z } from "zod";
import { brl } from "./format";

/** Conteudo da landing page de cadastro de revendedores (editavel pelo fornecedor). */

const short = (max: number) => z.string().trim().max(max).default("");

export const landingSchema = z.object({
  headline: short(140),
  subheadline: short(400),
  ctaText: short(40),
  heroStyle: z.enum(["image", "color", "dark"]).default("color"),
  stats: z.array(z.object({ value: short(20), label: short(60) })).max(4).default([]),
  supplyTitle: short(100),
  supplyText: short(1500),
  showCategories: z.boolean().default(true),
  productsTitle: short(100),
  productsSource: z.enum(["featured", "new", "best"]).default("featured"),
  productsCount: z.number().int().min(4).max(16).default(8),
  benefits: z.array(z.object({ title: short(80), text: short(300) })).max(6).default([]),
  steps: z.array(z.object({ title: short(80), text: short(240) })).max(6).default([]),
  rules: z.array(short(240)).max(12).default([]),
  showAutoRules: z.boolean().default(true),
  testimonials: z.array(z.object({ name: short(60), role: short(80), text: short(500) })).max(6).default([]),
  faq: z.array(z.object({ q: short(200), a: short(1200) })).max(12).default([]),
  instagram: short(200),
  publicEmail: short(120),
  signupTitle: short(120),
  signupText: short(400),
  sections: z
    .object({
      stats: z.boolean().default(true),
      supply: z.boolean().default(true),
      products: z.boolean().default(true),
      benefits: z.boolean().default(true),
      steps: z.boolean().default(true),
      rules: z.boolean().default(true),
      testimonials: z.boolean().default(true),
      faq: z.boolean().default(true),
    })
    .default({ stats: true, supply: true, products: true, benefits: true, steps: true, rules: true, testimonials: true, faq: true }),
});

export type LandingConfig = z.infer<typeof landingSchema>;
export type LandingSection = keyof LandingConfig["sections"];

type SupplierLike = {
  name: string;
  description: string | null;
  shippingDeadline: string | null;
  handlingFee: number;
  requireLabel: boolean;
  autoApproveResellers: boolean;
  landing: unknown;
};

/** Textos prontos para o fornecedor ja comecar com uma pagina bonita. */
export function defaultLanding(s: SupplierLike): LandingConfig {
  return {
    headline: `Revenda os produtos da ${s.name} sem ter estoque`,
    subheadline:
      s.description ||
      "Escolha os produtos, anuncie no seu marketplace e nós enviamos direto para o seu cliente. Fotos, títulos e descrições prontos para copiar.",
    ctaText: "Quero ser revendedor",
    heroStyle: "color",
    stats: [
      { value: "{produtos}", label: "produtos no catálogo" },
      { value: s.shippingDeadline ? "Rápido" : "24h", label: s.shippingDeadline || "para postagem" },
      { value: "0", label: "estoque necessário" },
      { value: "100%", label: "online e no celular" },
    ],
    supplyTitle: "O que fornecemos",
    supplyText: "Produtos com estoque próprio, prontos para você anunciar na Shopee, Mercado Livre, TikTok Shop e onde mais vender.",
    showCategories: true,
    productsTitle: "Alguns produtos do catálogo",
    productsSource: "featured",
    productsCount: 8,
    benefits: [
      { title: "Sem estoque, sem risco", text: "Você só compra depois que vende. Nada parado na sua casa." },
      { title: "Anúncio pronto em segundos", text: "Copie títulos, descrição e ficha técnica e baixe todas as fotos com um toque." },
      { title: "Enviamos por você", text: "Separamos, embalamos e postamos com a etiqueta do seu marketplace." },
      { title: "Acompanhe tudo pelo celular", text: "Status do pedido em tempo real, do pagamento até o envio." },
      { title: "Calculadora de preço", text: "Descubra o preço certo em cada plataforma já com taxas e impostos." },
      { title: "Suporte direto", text: "Fale com a nossa equipe pelo chat do portal ou pelo WhatsApp." },
    ],
    steps: [
      { title: "Cadastre-se", text: "Crie sua conta de revendedor em menos de um minuto." },
      { title: "Escolha e anuncie", text: "Selecione os produtos e publique no seu marketplace." },
      { title: "Vendeu? Faça o pedido", text: "Anexe a etiqueta do marketplace e pague com saldo via PIX." },
      { title: "Nós enviamos", text: "Seu cliente recebe e você acompanha cada etapa." },
    ],
    rules: [],
    showAutoRules: true,
    testimonials: [],
    faq: [
      { q: "Preciso ter CNPJ?", a: "Você pode começar como pessoa física. Para vender com nota fiscal nos marketplaces, o CNPJ (inclusive MEI) é recomendado." },
      { q: "Como pago os pedidos?", a: "Você adiciona saldo via PIX no portal. Cada pedido é pago automaticamente com o saldo e já entra na fila de separação." },
      { q: "Quem envia o produto?", a: "Nós. Você anexa a etiqueta gerada pelo marketplace e postamos direto para o seu cliente." },
      { q: "E se o cliente devolver?", a: "Você solicita a devolução pelo portal. Ao recebermos o produto, o valor volta para o seu saldo." },
    ],
    instagram: "",
    publicEmail: "",
    signupTitle: `Comece a revender ${s.name} hoje`,
    signupText: s.autoApproveResellers ? "Seu acesso é liberado na hora." : "Após o cadastro, analisamos e liberamos seu acesso.",
    sections: { stats: true, supply: true, products: true, benefits: true, steps: true, rules: true, testimonials: true, faq: true },
  };
}

/** Configuracao salva mesclada com os padroes (campos novos ganham valor padrao). */
export function resolveLanding(s: SupplierLike): LandingConfig {
  const base = defaultLanding(s);
  if (!s.landing || typeof s.landing !== "object") return base;
  const parsed = landingSchema.partial().safeParse(s.landing);
  if (!parsed.success) return base;
  const saved = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  return { ...base, ...saved, sections: { ...base.sections, ...(parsed.data.sections ?? {}) } } as LandingConfig;
}

/** Regras geradas a partir das configuracoes reais do fornecedor. */
export function autoRules(s: SupplierLike) {
  const r: string[] = [];
  r.push(s.autoApproveResellers ? "Cadastro aprovado na hora" : "Cadastro sujeito a aprovação da nossa equipe");
  r.push("Pedidos pagos com saldo pré-pago via PIX, confirmados automaticamente");
  if (s.handlingFee > 0) r.push(`Taxa de ${brl(s.handlingFee)} por pedido para separação e embalagem`);
  if (s.shippingDeadline) r.push(s.shippingDeadline);
  if (s.requireLabel) r.push("Todo pedido deve ter a etiqueta de envio do marketplace anexada");
  r.push("Devoluções solicitadas pelo portal, com estorno no saldo");
  return r;
}

export function safeHttpUrl(v: string) {
  const t = v.trim();
  if (!t) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function instagramUrl(v: string) {
  const t = v.trim();
  if (!t) return "";
  if (/instagram\.com/i.test(t)) return safeHttpUrl(t);
  const handle = t.replace(/^@/, "").replace(/[^\w.]/g, "");
  return handle ? `https://instagram.com/${handle}` : "";
}
