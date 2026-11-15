import "server-only";
import { eq } from "drizzle-orm";
import { categories, db, feeProfiles, posts, products, resellers, suppliers, users, variants } from "@/db";
import { DEFAULT_FEE_PROFILES } from "./constants";
import { hashPassword } from "./auth";
import { createOrderTx } from "./orders";
import { applyWallet } from "./wallet";

const img = (seed: string, n = 4) => Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/${seed}${i}/900/900`);

type DemoProduct = {
  name: string;
  sku: string;
  cat: string;
  price: number;
  suggested: number;
  cost: number;
  options?: { names: string[]; values: string[][] };
  stock: number;
  featured?: boolean;
};

const DEMO: DemoProduct[] = [
  { name: "Fone Bluetooth TWS Pro com Cancelamento de Ruído", sku: "FON-TWS-PRO", cat: "Eletrônicos", price: 4990, suggested: 12990, cost: 3100, stock: 120, featured: true, options: { names: ["Cor"], values: [["Preto"], ["Branco"]] } },
  { name: "Smartwatch Fitness D20 Tela Touch", sku: "SMW-D20", cat: "Eletrônicos", price: 3290, suggested: 8990, cost: 2100, stock: 64, options: { names: ["Cor"], values: [["Preto"], ["Rosa"], ["Azul"]] } },
  { name: "Garrafa Térmica Inox 1L Parede Dupla", sku: "GAR-INOX-1L", cat: "Casa e Cozinha", price: 2490, suggested: 6990, cost: 1500, stock: 200, featured: true },
  { name: "Organizador de Maquiagem Acrílico Giratório", sku: "ORG-ACR-360", cat: "Beleza", price: 3990, suggested: 9990, cost: 2400, stock: 35 },
  { name: "Camiseta Oversized Algodão Premium", sku: "CAM-OVS", cat: "Moda", price: 2990, suggested: 7990, cost: 1700, stock: 0, featured: true, options: { names: ["Cor", "Tamanho"], values: [["Preto", "P"], ["Preto", "M"], ["Preto", "G"], ["Off-white", "P"], ["Off-white", "M"], ["Off-white", "G"]] } },
  { name: "Luminária LED de Mesa Recarregável", sku: "LUM-LED-USB", cat: "Casa e Cozinha", price: 3490, suggested: 8490, cost: 2000, stock: 4 },
  { name: "Kit 3 Potes Herméticos de Vidro", sku: "KIT-POT-3", cat: "Casa e Cozinha", price: 4490, suggested: 10990, cost: 2900, stock: 80 },
  { name: "Mini Projetor Portátil HD Wi-Fi", sku: "PRJ-MINI-HD", cat: "Eletrônicos", price: 18990, suggested: 39990, cost: 13500, stock: 18, featured: true },
];

export async function seedDemo() {
  const exists = await db.query.users.findFirst({ where: eq(users.email, "fornecedor@demo.com") });
  if (exists) return;
  const passwordHash = await hashPassword("demo1234");

  await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(suppliers)
      .values({
        name: "Atacado Demo",
        slug: "demo",
        email: "fornecedor@demo.com",
        phone: "11999990000",
        whatsapp: "11999990000",
        primaryColor: "#4f46e5",
        description: "Fornecedor de eletrônicos, casa e moda com envio em até 24h úteis. Estoque próprio e etiqueta do marketplace.",
        city: "São Paulo",
        state: "SP",
        pixKey: "fornecedor@demo.com",
        pixHolder: "Atacado Demo LTDA",
        pixCity: "Sao Paulo",
        handlingFee: 300,
        autoApproveResellers: true,
        showcaseShowPrices: true,
        shippingDeadline: "Postagem em até 24h úteis",
        status: "ACTIVE",
      })
      .returning();

    await tx.insert(users).values({ name: "Equipe Demo", email: "fornecedor@demo.com", passwordHash, role: "SUPPLIER", supplierId: s.id });

    const catNames = [...new Set(DEMO.map((d) => d.cat))];
    const cats = await tx
      .insert(categories)
      .values(catNames.map((name, i) => ({ supplierId: s.id, name, position: i })))
      .returning();
    const catId = (n: string) => cats.find((c) => c.name === n)!.id;

    const createdVariants: string[] = [];
    for (const d of DEMO) {
      const [p] = await tx
        .insert(products)
        .values({
          supplierId: s.id,
          categoryId: catId(d.cat),
          name: d.name,
          sku: d.sku,
          brand: "Demo",
          titleShopee: `${d.name} Original Envio Imediato Promoção`.slice(0, 120),
          titleMl: d.name.slice(0, 60),
          description: `${d.name}\n\nProduto de alta qualidade, pronto para envio.\n\nCaracterísticas:\n- Material resistente\n- Garantia de 90 dias\n- Envio em até 24h úteis\n\nItens inclusos:\n- 1 unidade do produto\n- Manual em português`,
          images: img(d.sku.toLowerCase()),
          price: d.price,
          suggestedPrice: d.suggested,
          costPrice: d.cost,
          weightGrams: 350,
          heightCm: 8,
          widthCm: 15,
          lengthCm: 20,
          featured: d.featured ?? false,
          hasVariants: !!d.options,
          optionNames: d.options?.names ?? [],
          tags: [d.cat.toLowerCase()],
        })
        .returning();
      const rows = d.options
        ? d.options.values.map((vals, i) => ({
            productId: p.id,
            name: vals.join(" / "),
            sku: `${d.sku}-${vals.map((v) => v.slice(0, 3).toUpperCase()).join("-")}`,
            options: vals,
            stock: d.stock === 0 ? (i % 2 === 0 ? 0 : 12) : Math.ceil(d.stock / d.options!.values.length),
            position: i,
          }))
        : [{ productId: p.id, name: "Único", sku: d.sku, options: [], stock: d.stock, position: 0 }];
      const vs = await tx.insert(variants).values(rows).returning({ id: variants.id, stock: variants.stock });
      for (const v of vs) if (v.stock > 2) createdVariants.push(v.id);
    }

    const [r] = await tx
      .insert(resellers)
      .values({ supplierId: s.id, name: "Revendedor Demo", storeName: "Loja Demo Shop", phone: "11988887777", status: "ACTIVE", marketplaces: ["SHOPEE", "MERCADO_LIVRE"] })
      .returning();
    await tx.insert(feeProfiles).values(DEFAULT_FEE_PROFILES.map((f, i) => ({ ...f, resellerId: r.id, position: i })));
    await tx.insert(users).values({ name: "Revendedor Demo", email: "revendedor@demo.com", passwordHash, role: "RESELLER", resellerId: r.id });

    await applyWallet(tx, { supplierId: s.id, resellerId: r.id, type: "DEPOSIT", amount: 50000, description: "Depósito inicial (demonstração)" });

    await tx.insert(posts).values([
      {
        supplierId: s.id,
        title: "Bem-vindo ao nosso portal de revenda",
        content:
          "Aqui você encontra todos os nossos produtos com fotos, títulos e descrições prontos para anunciar.\n\nComo funciona:\n1. Escolha os produtos no catálogo\n2. Anuncie no seu marketplace\n3. Vendeu? Faça o pedido aqui e anexe a etiqueta\n4. Nós separamos, embalamos e enviamos direto para o seu cliente",
        pinned: true,
        authorName: "Equipe Demo",
      },
      { supplierId: s.id, title: "Novidade: Mini Projetor HD chegou ao estoque", content: "Produto com ótima margem para revenda. Confira no catálogo.", authorName: "Equipe Demo" },
    ]);

    for (let i = 0; i < 3; i++) {
      const vid = createdVariants[i * 2 % createdVariants.length];
      await createOrderTx(tx, {
        supplierId: s.id,
        resellerId: r.id,
        handlingFee: s.handlingFee,
        lines: [{ variantId: vid, quantity: 1 + (i % 2) }],
        marketplace: i % 2 ? "MERCADO_LIVRE" : "SHOPEE",
        externalOrderId: `2611${1000 + i}ABC`,
        customerName: ["Maria S.", "João P.", "Ana L."][i],
        actorName: "Revendedor Demo",
      });
    }
  });
}
