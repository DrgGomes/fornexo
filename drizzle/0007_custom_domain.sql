ALTER TABLE "suppliers" ADD COLUMN "custom_domain_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "custom_domain_status" text;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "custom_domain_apex" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_custom_domain_unique" UNIQUE("custom_domain");
