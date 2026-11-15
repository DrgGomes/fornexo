# Fornexo

Plataforma SaaS de dropshipping para fornecedores que vendem através de revendedores em marketplaces (Shopee, Mercado Livre, TikTok Shop, Amazon e outros).

## Áreas
- **Fornecedor** (`/f`): dashboard, produtos com variações, estoque, pedidos, bipagem por código de barras (leitor USB/Bluetooth ou câmera), cupom térmico 80/58mm, folha de separação, etiquetas em PDF único, revendedores, financeiro com aprovação de PIX, devoluções, chat, notícias, equipe.
- **Revendedor** (`/r`): catálogo, meus produtos, cópia de títulos/descrição/ficha, download de fotos (individual, ZIP ou galeria do celular), pedidos com etiqueta, carteira com QR Code PIX, calculadora de preço com taxas das plataformas, devoluções, chat, notícias.
- **Vitrine pública** (`/v/[slug]`) com cadastro de revendedores.
- **Administração da plataforma** (`/admin`): fornecedores, planos, vencimentos e bloqueio.

## Stack
Next.js 15 (App Router), React 19, Tailwind CSS 4, Drizzle ORM + PostgreSQL, Vercel Blob.

## Variáveis de ambiente
Veja `.env.example`. As migrações rodam automaticamente no build (`scripts/migrate.mjs`).

## Primeiro acesso
Abra `/setup` para criar o administrador (opcionalmente com dados de demonstração).
Demo: `fornecedor@demo.com` / `revendedor@demo.com`, senha `demo1234`.
