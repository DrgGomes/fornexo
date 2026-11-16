CREATE TYPE "public"."import_status" AS ENUM('PENDING', 'CONVERTED', 'DISCARDED');--> statement-breakpoint
CREATE TABLE "imported_products" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_id" text NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer,
	"images" text[] DEFAULT '{}' NOT NULL,
	"attributes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"variations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brand" text,
	"sku" text,
	"gtin" text,
	"status" "import_status" DEFAULT 'PENDING' NOT NULL,
	"product_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "importer_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "import_token_hash" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "import_token_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "imported_products" ADD CONSTRAINT "imported_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_products" ADD CONSTRAINT "imported_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "imported_supplier_url_uq" ON "imported_products" USING btree ("supplier_id","source_url");--> statement-breakpoint
CREATE INDEX "imported_supplier_status_idx" ON "imported_products" USING btree ("supplier_id","status","created_at");