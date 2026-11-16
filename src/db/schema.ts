import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { newId } from "../lib/id";

// Valores monetarios sempre em centavos (integer)

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => newId());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const roleEnum = pgEnum("role", ["ADMIN", "SUPPLIER", "RESELLER"]);
export const supplierStatusEnum = pgEnum("supplier_status", ["TRIAL", "ACTIVE", "BLOCKED"]);
export const resellerStatusEnum = pgEnum("reseller_status", ["PENDING", "ACTIVE", "BLOCKED"]);
export const productStatusEnum = pgEnum("product_status", ["ACTIVE", "DRAFT", "ARCHIVED"]);
export const orderStatusEnum = pgEnum("order_status", [
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "PICKING",
  "PICKED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
]);
export const returnStatusEnum = pgEnum("return_status", ["REQUESTED", "APPROVED", "REJECTED", "COMPLETED"]);
export const txTypeEnum = pgEnum("tx_type", ["DEPOSIT", "ORDER_PAYMENT", "REFUND", "ADJUSTMENT"]);
export const importStatusEnum = pgEnum("import_status", ["PENDING", "CONVERTED", "DISCARDED"]);
export const depositStatusEnum = pgEnum("deposit_status", ["PENDING", "APPROVED", "REJECTED"]);

export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type ReturnStatus = (typeof returnStatusEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];

export const suppliers = pgTable("suppliers", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  document: text("document"),
  email: text("email").notNull(),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  primaryColor: text("primary_color").notNull().default("#4f46e5"),
  description: text("description"),
  city: text("city"),
  state: text("state"),
  pixKey: text("pix_key"),
  pixHolder: text("pix_holder"),
  pixCity: text("pix_city"),
  handlingFee: integer("handling_fee").notNull().default(0),
  autoApproveResellers: boolean("auto_approve_resellers").notNull().default(false),
  showcasePublic: boolean("showcase_public").notNull().default(true),
  showcaseShowPrices: boolean("showcase_show_prices").notNull().default(false),
  requireLabel: boolean("require_label").notNull().default(true),
  shippingDeadline: text("shipping_deadline"),
  plan: text("plan").notNull().default("PRO"),
  status: supplierStatusEnum("status").notNull().default("TRIAL"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  paidUntil: timestamp("paid_until", { withTimezone: true }),
  adminNotes: text("admin_notes"),
  orderSeq: integer("order_seq").notNull().default(0),
  importerEnabled: boolean("importer_enabled").notNull().default(false),
  /** Conteudo editavel da landing page de cadastro de revendedores */
  landing: jsonb("landing").$type<Record<string, unknown>>(),
  importTokenHash: text("import_token_hash"),
  importTokenCreatedAt: timestamp("import_token_created_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const resellers = pgTable(
  "resellers",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    storeName: text("store_name"),
    document: text("document"),
    phone: text("phone"),
    city: text("city"),
    state: text("state"),
    marketplaces: text("marketplaces").array().notNull().default([]),
    status: resellerStatusEnum("status").notNull().default("PENDING"),
    balance: integer("balance").notNull().default(0),
    notes: text("notes"),
    taxPct: doublePrecision("tax_pct").notNull().default(6),
    adsPct: doublePrecision("ads_pct").notNull().default(0),
    packagingCost: integer("packaging_cost").notNull().default(0),
    otherCost: integer("other_cost").notNull().default(0),
    targetMarginPct: doublePrecision("target_margin_pct").notNull().default(20),
    newsSeenAt: timestamp("news_seen_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("resellers_supplier_idx").on(t.supplierId, t.status)],
);

export const users = pgTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull(),
    phone: text("phone"),
    active: boolean("active").notNull().default(true),
    supplierId: text("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }),
    resellerId: text("reseller_id")
      .unique()
      .references(() => resellers.id, { onDelete: "cascade" }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    sessionVersion: integer("session_version").notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [index("users_supplier_idx").on(t.supplierId)],
);

/** Registro de tentativas para limitar forca bruta (login, cadastro). */
export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: id(),
    key: text("key").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("auth_attempts_key_idx").on(t.key, t.createdAt)],
);

export const feeProfiles = pgTable(
  "fee_profiles",
  {
    id: id(),
    resellerId: text("reseller_id")
      .notNull()
      .references(() => resellers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    commissionPct: doublePrecision("commission_pct").notNull().default(0),
    extraPct: doublePrecision("extra_pct").notNull().default(0),
    fixedFee: integer("fixed_fee").notNull().default(0),
    fixedFeeThreshold: integer("fixed_fee_threshold"),
    shippingCost: integer("shipping_cost").notNull().default(0),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("fee_profiles_reseller_idx").on(t.resellerId)],
);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("categories_supplier_name_uq").on(t.supplierId, t.name)],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    brand: text("brand"),
    titleShopee: text("title_shopee"),
    titleMl: text("title_ml"),
    description: text("description").notNull().default(""),
    images: text("images").array().notNull().default([]),
    videoUrl: text("video_url"),
    price: integer("price").notNull(),
    suggestedPrice: integer("suggested_price"),
    costPrice: integer("cost_price"),
    weightGrams: integer("weight_grams"),
    heightCm: doublePrecision("height_cm"),
    widthCm: doublePrecision("width_cm"),
    lengthCm: doublePrecision("length_cm"),
    ean: text("ean"),
    ncm: text("ncm"),
    tags: text("tags").array().notNull().default([]),
    status: productStatusEnum("status").notNull().default("ACTIVE"),
    featured: boolean("featured").notNull().default(false),
    hasVariants: boolean("has_variants").notNull().default(false),
    optionNames: text("option_names").array().notNull().default([]),
    lowStockAlert: integer("low_stock_alert").notNull().default(5),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("products_supplier_sku_uq").on(t.supplierId, t.sku),
    index("products_supplier_status_idx").on(t.supplierId, t.status),
  ],
);

// Todo produto tem ao menos 1 variante (produto simples = 1 variante "Unico").
export const variants = pgTable(
  "variants",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    options: text("options").array().notNull().default([]),
    price: integer("price"),
    stock: integer("stock").notNull().default(0),
    imageUrl: text("image_url"),
    ean: text("ean"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

export const favorites = pgTable(
  "reseller_products",
  {
    resellerId: text("reseller_id")
      .notNull()
      .references(() => resellers.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.resellerId, t.productId] })],
);

export const files = pgTable("files", {
  id: id(),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  ownerResellerId: text("owner_reseller_id"),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url"),
  data: bytea("data"),
  createdAt: createdAt(),
});

export const orders = pgTable(
  "orders",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    resellerId: text("reseller_id")
      .notNull()
      .references(() => resellers.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    status: orderStatusEnum("status").notNull().default("AWAITING_PAYMENT"),
    paid: boolean("paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    marketplace: text("marketplace").notNull(),
    externalOrderId: text("external_order_id"),
    customerName: text("customer_name"),
    labelFileId: text("label_file_id").references(() => files.id, { onDelete: "set null" }),
    subtotal: integer("subtotal").notNull(),
    handlingFee: integer("handling_fee").notNull().default(0),
    total: integer("total").notNull(),
    itemsCost: integer("items_cost").notNull().default(0),
    notes: text("notes"),
    supplierNotes: text("supplier_notes"),
    trackingCode: text("tracking_code"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_supplier_number_uq").on(t.supplierId, t.number),
    index("orders_supplier_status_idx").on(t.supplierId, t.status),
    index("orders_supplier_created_idx").on(t.supplierId, t.createdAt),
    index("orders_reseller_created_idx").on(t.resellerId, t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: text("variant_id").references(() => variants.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    variantName: text("variant_name"),
    sku: text("sku").notNull(),
    imageUrl: text("image_url"),
    unitPrice: integer("unit_price").notNull(),
    unitCost: integer("unit_cost").notNull().default(0),
    quantity: integer("quantity").notNull(),
    total: integer("total").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_product_idx").on(t.productId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status"),
    message: text("message").notNull(),
    actorName: text("actor_name"),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    resellerId: text("reseller_id")
      .notNull()
      .references(() => resellers.id, { onDelete: "cascade" }),
    type: txTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    description: text("description").notNull(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    depositId: text("deposit_id"),
    returnId: text("return_id"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [
    index("tx_supplier_created_idx").on(t.supplierId, t.createdAt),
    index("tx_reseller_created_idx").on(t.resellerId, t.createdAt),
  ],
);

export const deposits = pgTable(
  "deposits",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    resellerId: text("reseller_id")
      .notNull()
      .references(() => resellers.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    proofFileId: text("proof_file_id").references(() => files.id, { onDelete: "set null" }),
    status: depositStatusEnum("status").notNull().default("PENDING"),
    note: text("note"),
    rejectReason: text("reject_reason"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("deposits_supplier_status_idx").on(t.supplierId, t.status), index("deposits_reseller_idx").on(t.resellerId)],
);

export type ReturnItem = { orderItemId: string; quantity: number };

export const returns = pgTable(
  "returns",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    resellerId: text("reseller_id")
      .notNull()
      .references(() => resellers.id, { onDelete: "cascade" }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: returnStatusEnum("status").notNull().default("REQUESTED"),
    reason: text("reason").notNull(),
    details: text("details"),
    items: jsonb("items").$type<ReturnItem[]>().notNull(),
    photoFileIds: text("photo_file_ids").array().notNull().default([]),
    requestedAmount: integer("requested_amount").notNull().default(0),
    refundAmount: integer("refund_amount"),
    supplierNote: text("supplier_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("returns_supplier_status_idx").on(t.supplierId, t.status), index("returns_reseller_idx").on(t.resellerId)],
);

export const posts = pgTable(
  "posts",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    coverUrl: text("cover_url"),
    pinned: boolean("pinned").notNull().default(false),
    published: boolean("published").notNull().default(true),
    authorName: text("author_name"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("posts_supplier_created_idx").on(t.supplierId, t.createdAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    resellerId: text("reseller_id")
      .notNull()
      .references(() => resellers.id, { onDelete: "cascade" }),
    fromSupplier: boolean("from_supplier").notNull(),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    productId: text("product_id"),
    orderId: text("order_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conv_idx").on(t.supplierId, t.resellerId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    resellerId: text("reseller_id").references(() => resellers.id, { onDelete: "cascade" }),
    toSupplier: boolean("to_supplier").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("notif_supplier_idx").on(t.supplierId, t.toSupplier, t.readAt),
    index("notif_reseller_idx").on(t.resellerId, t.readAt),
  ],
);

export type ImportAttribute = { name: string; value: string };
export type ImportVariation = { name: string; values: string[] };

/** Anuncios capturados pela extensao (Mercado Livre, Shopee, TikTok, Temu) aguardando revisao. */
export const importedProducts = pgTable(
  "imported_products",
  {
    id: id(),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    price: integer("price"),
    images: text("images").array().notNull().default([]),
    attributes: jsonb("attributes").$type<ImportAttribute[]>().notNull().default([]),
    variations: jsonb("variations").$type<ImportVariation[]>().notNull().default([]),
    brand: text("brand"),
    sku: text("sku"),
    gtin: text("gtin"),
    status: importStatusEnum("status").notNull().default("PENDING"),
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("imported_supplier_url_uq").on(t.supplierId, t.sourceUrl),
    index("imported_supplier_status_idx").on(t.supplierId, t.status, t.createdAt),
  ],
);

// ---------------- Relations ----------------

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  users: many(users),
  resellers: many(resellers),
  products: many(products),
  categories: many(categories),
  orders: many(orders),
}));

export const usersRelations = relations(users, ({ one }) => ({
  supplier: one(suppliers, { fields: [users.supplierId], references: [suppliers.id] }),
  reseller: one(resellers, { fields: [users.resellerId], references: [resellers.id] }),
}));

export const resellersRelations = relations(resellers, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [resellers.supplierId], references: [suppliers.id] }),
  user: one(users, { fields: [resellers.id], references: [users.resellerId] }),
  feeProfiles: many(feeProfiles),
  orders: many(orders),
  favorites: many(favorites),
}));

export const feeProfilesRelations = relations(feeProfiles, ({ one }) => ({
  reseller: one(resellers, { fields: [feeProfiles.resellerId], references: [resellers.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [categories.supplierId], references: [suppliers.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(variants),
  favorites: many(favorites),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  reseller: one(resellers, { fields: [favorites.resellerId], references: [resellers.id] }),
  product: one(products, { fields: [favorites.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [orders.supplierId], references: [suppliers.id] }),
  reseller: one(resellers, { fields: [orders.resellerId], references: [resellers.id] }),
  labelFile: one(files, { fields: [orders.labelFileId], references: [files.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  returns: many(returns),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(variants, { fields: [orderItems.variantId], references: [variants.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  reseller: one(resellers, { fields: [transactions.resellerId], references: [resellers.id] }),
  order: one(orders, { fields: [transactions.orderId], references: [orders.id] }),
}));

export const depositsRelations = relations(deposits, ({ one }) => ({
  reseller: one(resellers, { fields: [deposits.resellerId], references: [resellers.id] }),
  proofFile: one(files, { fields: [deposits.proofFileId], references: [files.id] }),
}));

export const returnsRelations = relations(returns, ({ one }) => ({
  reseller: one(resellers, { fields: [returns.resellerId], references: [resellers.id] }),
  order: one(orders, { fields: [returns.orderId], references: [orders.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  reseller: one(resellers, { fields: [messages.resellerId], references: [resellers.id] }),
}));
