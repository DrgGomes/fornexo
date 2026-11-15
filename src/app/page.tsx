import Link from "next/link";
import {
  ArrowRight,
  ChartColumn,
  Copy,
  Download,
  MessageCircle,
  Printer,
  Calculator,
  ScanBarcode,
  Store,
  Undo2,
  Wallet,
  Newspaper,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/constants";

const FEATURES = [
  { icon: ScanBarcode, title: "Bipagem de pedidos", text: "Bipe o código de barras do cupom e atualize o status em um segundo. O revendedor vê na hora." },
  { icon: Printer, title: "Cupom e etiquetas", text: "Imprima o pedido em formato de cupom térmico e todas as etiquetas do dia em um PDF só." },
  { icon: Store, title: "Vitrine pública", text: "Um link bonito para apresentar seu catálogo a novos revendedores e captar cadastros." },
  { icon: Copy, title: "Anúncio em segundos", text: "Revendedor copia títulos, descrição e ficha técnica com um toque. Sem retrabalho." },
  { icon: Download, title: "Fotos em massa", text: "Baixe uma foto, todas em ZIP, ou salve direto na galeria do celular." },
  { icon: Calculator, title: "Calculadora de preço", text: "Taxas da Shopee, Mercado Livre e TikTok configuráveis. Preço ideal e lucro real." },
  { icon: Wallet, title: "Carteira com PIX", text: "Saldo pré-pago com QR Code PIX. Pedido pago automaticamente, sem cobrança manual." },
  { icon: Undo2, title: "Devoluções", text: "Fluxo completo de solicitação, aprovação, recebimento e estorno automático no saldo." },
  { icon: ChartColumn, title: "Financeiro e gráficos", text: "Faturamento, lucro estimado, ticket médio, ranking de produtos e revendedores." },
  { icon: MessageCircle, title: "Chat direto", text: "Conversa entre fornecedor e revendedor com contexto do produto ou do pedido." },
  { icon: Newspaper, title: "Notícias no portal", text: "Avise lançamentos, reposições e mudanças para todos os revendedores de uma vez." },
];

const STEPS = [
  { n: "01", title: "Cadastre seus produtos", text: "Variações, preço de revenda, fotos por link, títulos para cada marketplace." },
  { n: "02", title: "Compartilhe a vitrine", text: "Revendedores se cadastram, escolhem o que anunciar e copiam tudo pronto." },
  { n: "03", title: "Receba pedidos com etiqueta", text: "O revendedor vende, faz o pedido e anexa a etiqueta do marketplace." },
  { n: "04", title: "Separe, bipe e envie", text: "Cupom com código de barras, status em tempo real e financeiro automático." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">F</span>
            <span className="text-[15px] font-semibold tracking-tight">Fornexo</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/entrar" className={buttonClass("ghost", "md")}>
              Entrar
            </Link>
            <Link href="/cadastro" className={buttonClass("dark", "md")}>
              Teste grátis
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(99,102,241,0.14),transparent)]" />
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[13px] font-medium text-zinc-700">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Feito para dropshipping de marketplace
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-6xl">
            Seu estoque vendendo em centenas de lojas online.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-pretty text-zinc-500">
            Plataforma completa para fornecedores que vendem via revendedores na Shopee, Mercado Livre, TikTok Shop e outros. Catálogo,
            pedidos com etiqueta, bipagem, financeiro e portal do revendedor.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/cadastro" className={buttonClass("dark", "lg")}>
              Começar {TRIAL_DAYS} dias grátis <ArrowRight />
            </Link>
            <Link href="/v/demo" className={buttonClass("secondary", "lg")}>
              Ver vitrine de exemplo
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl bg-zinc-50 p-6 ring-1 ring-zinc-100">
              <span className="font-mono text-xs font-medium text-indigo-600">{s.n}</span>
              <h3 className="mt-3 font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-zinc-950 py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Tudo que fornecedor e revendedor usam no dia a dia.</h2>
          <p className="mt-3 max-w-xl text-zinc-400">Rápido no computador e perfeito no celular. Menos cliques, menos planilhas, mais pedidos enviados.</p>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-zinc-950 p-6">
                <f.icon className="size-5 text-indigo-400" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Pronto para escalar sua rede de revendedores?</h2>
        <p className="mt-3 text-zinc-500">Crie sua conta em menos de um minuto.</p>
        <Link href="/cadastro" className={buttonClass("dark", "lg", "mt-7")}>
          Criar conta de fornecedor <ArrowRight />
        </Link>
      </section>

      <footer className="border-t border-zinc-100 py-8 text-center text-sm text-zinc-400">Fornexo. Plataforma de dropshipping.</footer>
    </div>
  );
}
