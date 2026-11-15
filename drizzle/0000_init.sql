CREATE TYPE "public"."deposit_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('AWAITING_PAYMENT', 'CONFIRMED', 'PICKING', 'PICKED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('ACTIVE', 'DRAFT', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."reseller_status" AS ENUM('PENDING', 'ACTIVE', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'SUPPLIER', 'RESELLER');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('TRIAL', 'ACTIVE', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."tx_type" AS ENUM('DEPOSIT', 'ORDER_PAYMENT', 'REFUND', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"reseller_id" text NOT NULL,
	"amount" integer NOT NULL,
	"proof_file_id" text,
	"status" "deposit_status" DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"reject_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reseller_products" (
	"reseller_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reseller_products_reseller_id_product_id_pk" PRIMARY KEY("reseller_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "fee_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"reseller_id" text NOT NULL,
	"name" text NOT NULL,
	"commission_pct" double precision DEFAULT 0 NOT NULL,
	"extra_pct" double precision DEFAULT 0 NOT NULL,
	"fixed_fee" integer DEFAULT 0 NOT NULL,
	"fixed_fee_threshold" integer,
	"shipping_cost" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"owner_reseller_id" text,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"url" text,
	"data" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"reseller_id" text NOT NULL,
	"from_supplier" boolean NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"product_id" text,
	"order_id" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"reseller_id" text,
	"to_supplier" boolean NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"status" "order_status",
	"message" text NOT NULL,
	"actor_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text,
	"variant_id" text,
	"product_name" text NOT NULL,
	"variant_name" text,
	"sku" text NOT NULL,
	"image_url" text,
	"unit_price" integer NOT NULL,
	"unit_cost" integer DEFAULT 0 NOT NULL,
	"quantity" integer NOT NULL,
	"total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"reseller_id" text NOT NULL,
	"number" integer NOT NULL,
	"status" "order_status" DEFAULT 'AWAITING_PAYMENT' NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"marketplace" text NOT NULL,
	"external_order_id" text,
	"customer_name" text,
	"label_file_id" text,
	"subtotal" integer NOT NULL,
	"handling_fee" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"items_cost" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"supplier_notes" text,
	"tracking_code" text,
	"shipped_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"cover_url" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"author_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"brand" text,
	"title_shopee" text,
	"title_ml" text,
	"description" text DEFAULT '' NOT NULL,
	"images" text[] DEFAULT '{}' NOT NULL,
	"video_url" text,
	"price" integer NOT NULL,
	"suggested_price" integer,
	"cost_price" integer,
	"weight_grams" integer,
	"height_cm" double precision,
	"width_cm" double precision,
	"length_cm" double precision,
	"ean" text,
	"ncm" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"status" "product_status" DEFAULT 'ACTIVE' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"has_variants" boolean DEFAULT false NOT NULL,
	"option_names" text[] DEFAULT '{}' NOT NULL,
	"low_stock_alert" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resellers" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"name" text NOT NULL,
	"store_name" text,
	"document" text,
	"phone" text,
	"city" text,
	"state" text,
	"marketplaces" text[] DEFAULT '{}' NOT NULL,
	"status" "reseller_status" DEFAULT 'PENDING' NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"tax_pct" double precision DEFAULT 6 NOT NULL,
	"ads_pct" double precision DEFAULT 0 NOT NULL,
	"packaging_cost" integer DEFAULT 0 NOT NULL,
	"other_cost" integer DEFAULT 0 NOT NULL,
	"target_margin_pct" double precision DEFAULT 20 NOT NULL,
	"news_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"reseller_id" text NOT NULL,
	"order_id" text NOT NULL,
	"status" "return_status" DEFAULT 'REQUESTED' NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"items" jsonb NOT NULL,
	"photo_file_ids" text[] DEFAULT '{}' NOT NULL,
	"requested_amount" integer DEFAULT 0 NOT NULL,
	"refund_amount" integer,
	"supplier_note" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"document" text,
	"email" text NOT NULL,
	"phone" text,
	"whatsapp" text,
	"logo_url" text,
	"banner_url" text,
	"primary_color" text DEFAULT '#4f46e5' NOT NULL,
	"description" text,
	"city" text,
	"state" text,
	"pix_key" text,
	"pix_holder" text,
	"pix_city" text,
	"handling_fee" integer DEFAULT 0 NOT NULL,
	"auto_approve_resellers" boolean DEFAULT false NOT NULL,
	"showcase_public" boolean DEFAULT true NOT NULL,
	"showcase_show_prices" boolean DEFAULT false NOT NULL,
	"require_label" boolean DEFAULT true NOT NULL,
	"shipping_deadline" text,
	"plan" text DEFAULT 'PRO' NOT NULL,
	"status" "supplier_status" DEFAULT 'TRIAL' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"paid_until" timestamp with time zone,
	"admin_notes" text,
	"order_seq" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"reseller_id" text NOT NULL,
	"type" "tx_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"description" text NOT NULL,
	"order_id" text,
	"deposit_id" text,
	"return_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"supplier_id" text,
	"reseller_id" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_reseller_id_unique" UNIQUE("reseller_id")
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"options" text[] DEFAULT '{}' NOT NULL,
	"price" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"image_url" text,
	"ean" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_proof_file_id_files_id_fk" FOREIGN KEY ("proof_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_products" ADD CONSTRAINT "reseller_products_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_products" ADD CONSTRAINT "reseller_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_profiles" ADD CONSTRAINT "fee_profiles_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_label_file_id_files_id_fk" FOREIGN KEY ("label_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resellers" ADD CONSTRAINT "resellers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_reseller_id_resellers_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."resellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_supplier_name_uq" ON "categories" USING btree ("supplier_id","name");--> statement-breakpoint
CREATE INDEX "deposits_supplier_status_idx" ON "deposits" USING btree ("supplier_id","status");--> statement-breakpoint
CREATE INDEX "deposits_reseller_idx" ON "deposits" USING btree ("reseller_id");--> statement-breakpoint
CREATE INDEX "fee_profiles_reseller_idx" ON "fee_profiles" USING btree ("reseller_id");--> statement-breakpoint
CREATE INDEX "messages_conv_idx" ON "messages" USING btree ("supplier_id","reseller_id","created_at");--> statement-breakpoint
CREATE INDEX "notif_supplier_idx" ON "notifications" USING btree ("supplier_id","to_supplier","read_at");--> statement-breakpoint
CREATE INDEX "notif_reseller_idx" ON "notifications" USING btree ("reseller_id","read_at");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_supplier_number_uq" ON "orders" USING btree ("supplier_id","number");--> statement-breakpoint
CREATE INDEX "orders_supplier_status_idx" ON "orders" USING btree ("supplier_id","status");--> statement-breakpoint
CREATE INDEX "orders_supplier_created_idx" ON "orders" USING btree ("supplier_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_reseller_created_idx" ON "orders" USING btree ("reseller_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_supplier_created_idx" ON "posts" USING btree ("supplier_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "products_supplier_sku_uq" ON "products" USING btree ("supplier_id","sku");--> statement-breakpoint
CREATE INDEX "products_supplier_status_idx" ON "products" USING btree ("supplier_id","status");--> statement-breakpoint
CREATE INDEX "resellers_supplier_idx" ON "resellers" USING btree ("supplier_id","status");--> statement-breakpoint
CREATE INDEX "returns_supplier_status_idx" ON "returns" USING btree ("supplier_id","status");--> statement-breakpoint
CREATE INDEX "returns_reseller_idx" ON "returns" USING btree ("reseller_id");--> statement-breakpoint
CREATE INDEX "tx_supplier_created_idx" ON "transactions" USING btree ("supplier_id","created_at");--> statement-breakpoint
CREATE INDEX "tx_reseller_created_idx" ON "transactions" USING btree ("reseller_id","created_at");--> statement-breakpoint
CREATE INDEX "users_supplier_idx" ON "users" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "variants_product_idx" ON "variants" USING btree ("product_id");