CREATE TABLE "service_options" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"service_id" varchar(50) NOT NULL,
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
--> statement-breakpoint
ALTER TABLE "provider_services" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_services" ADD COLUMN "provider_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "provider_services" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "description_ar" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "description_en" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "logo" text;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "rating" double precision DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "service_option_id" varchar(50);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_name_ar" varchar(150);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_name_en" varchar(150);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key" varchar(128);--> statement-breakpoint
ALTER TABLE "service_options" ADD CONSTRAINT "service_options_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_service_options_service" ON "service_options" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_service_options_active" ON "service_options" USING btree ("is_active","is_available");--> statement-breakpoint
CREATE INDEX "idx_service_options_srv_active_avail" ON "service_options" USING btree ("service_id","is_active","is_available");--> statement-breakpoint
CREATE INDEX "idx_service_options_sort" ON "service_options" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_users_role_suspended" ON "users" USING btree ("role","is_suspended");--> statement-breakpoint
CREATE INDEX "idx_prov_srv_service_avail" ON "provider_services" USING btree ("service_id","is_available");--> statement-breakpoint
CREATE INDEX "idx_prov_srv_provider_avail" ON "provider_services" USING btree ("provider_id","is_available");--> statement-breakpoint
CREATE INDEX "idx_providers_available" ON "providers" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "idx_providers_active_available" ON "providers" USING btree ("is_active","is_available");--> statement-breakpoint
CREATE INDEX "idx_services_cat_active_avail" ON "services" USING btree ("category_id","is_active","is_available");--> statement-breakpoint
CREATE INDEX "idx_coupons_code_active_expiry" ON "coupons" USING btree ("code","is_active","expiry_date");--> statement-breakpoint
CREATE INDEX "idx_order_items_option" ON "order_items" USING btree ("service_option_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_service" ON "order_items" USING btree ("order_id","service_id");--> statement-breakpoint
CREATE INDEX "idx_orders_customer_created" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_provider_status" ON "orders" USING btree ("provider_id","status");--> statement-breakpoint
CREATE INDEX "idx_orders_status_created" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_service_cat_status" ON "orders" USING btree ("service_category_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_customer_idempotency" ON "orders" USING btree ("customer_id","idempotency_key");