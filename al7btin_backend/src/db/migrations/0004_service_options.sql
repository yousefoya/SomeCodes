CREATE TABLE IF NOT EXISTS "service_options" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"service_id" varchar(50) NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
	"name_ar" varchar(150) NOT NULL,
	"name_en" varchar(150) NOT NULL,
	"option_type" varchar(50) DEFAULT 'variant' NOT NULL,
	"size" varchar(50),
	"price" numeric(10, 2) NOT NULL,
	"unit_ar" varchar(30) NOT NULL,
	"unit_en" varchar(30) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_service_options_service" ON "service_options" ("service_id");
CREATE INDEX IF NOT EXISTS "idx_service_options_active" ON "service_options" ("is_active", "is_available");
CREATE INDEX IF NOT EXISTS "idx_service_options_sort" ON "service_options" ("sort_order");

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "service_option_id" varchar(50);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_name_ar" varchar(150);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_name_en" varchar(150);
CREATE INDEX IF NOT EXISTS "idx_order_items_option" ON "order_items" ("service_option_id");
