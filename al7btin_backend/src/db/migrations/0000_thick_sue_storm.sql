CREATE TYPE "public"."user_role" AS ENUM('customer', 'admin', 'delivery', 'provider');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('delivery_product', 'home_service');--> statement-breakpoint
CREATE TYPE "public"."delivery_assignment_status" AS ENUM('unassigned', 'offered', 'accepted', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."coupon_type" AS ENUM('percentage', 'fixed_amount');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'offered_to_driver', 'awaiting_assignment', 'assigned', 'accepted', 'going_to_pickup', 'picked_up', 'going_to_customer', 'completed', 'failed', 'cancelled', 'rejected');--> statement-breakpoint
CREATE TABLE "auth_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(15) NOT NULL,
	"otp_hash" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_consumed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"device_info" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(15) NOT NULL,
	"name" varchar(100),
	"email" varchar(150),
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"wallet_balance" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"referral_code" varchar(20),
	"is_suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name_ar" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"description_ar" text,
	"description_en" text,
	"icon_name" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_coverage_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar(50) NOT NULL,
	"area_name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_service_categories" (
	"provider_id" varchar(50) NOT NULL,
	"category_id" varchar(50) NOT NULL,
	CONSTRAINT "provider_service_categories_provider_id_category_id_pk" PRIMARY KEY("provider_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name_ar" varchar(150) NOT NULL,
	"name_en" varchar(150) NOT NULL,
	"phone_number" varchar(15) NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"operating_hours" varchar(100) DEFAULT '08:00 AM - 10:00 PM' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"category_id" varchar(50) NOT NULL,
	"provider_id" varchar(50),
	"name_ar" varchar(150) NOT NULL,
	"name_en" varchar(150) NOT NULL,
	"description_ar" text,
	"description_en" text,
	"type" "service_type" NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"unit_ar" varchar(30) NOT NULL,
	"unit_en" varchar(30) NOT NULL,
	"requires_quotation" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(50) NOT NULL,
	"city" varchar(50) DEFAULT 'عمان' NOT NULL,
	"area" varchar(100) NOT NULL,
	"street_address" text NOT NULL,
	"building_number" varchar(30),
	"floor" varchar(20),
	"apartment_number" varchar(20),
	"delivery_instructions" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"delivery_employee_id" varchar(50) NOT NULL,
	"status" "delivery_assignment_status" DEFAULT 'offered' NOT NULL,
	"distance_to_pickup_km" numeric(6, 2),
	"rejection_reason" text,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "delivery_category_capabilities" (
	"delivery_employee_id" varchar(50) NOT NULL,
	"category_id" varchar(50) NOT NULL,
	CONSTRAINT "delivery_category_capabilities_delivery_employee_id_category_id_pk" PRIMARY KEY("delivery_employee_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_employees" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone_number" varchar(15) NOT NULL,
	"vehicle_type" varchar(50),
	"vehicle_plate_number" varchar(30),
	"latitude" double precision DEFAULT 31.9539 NOT NULL,
	"longitude" double precision DEFAULT 35.9106 NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"active_orders_count" integer DEFAULT 0 NOT NULL,
	"completed_orders_count" integer DEFAULT 0 NOT NULL,
	"rating" numeric(3, 2) DEFAULT '5.00' NOT NULL,
	"provider_id" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_employees_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "delivery_service_capabilities" (
	"delivery_employee_id" varchar(50) NOT NULL,
	"service_id" varchar(50) NOT NULL,
	"is_authorized" boolean DEFAULT true NOT NULL,
	CONSTRAINT "delivery_service_capabilities_delivery_employee_id_service_id_pk" PRIMARY KEY("delivery_employee_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "coupon_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"discount_amount" numeric(10, 2) NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"type" "coupon_type" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"min_order_value" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"expiry_date" timestamp with time zone,
	"usage_limit" integer DEFAULT 1000 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"title_ar" varchar(150) NOT NULL,
	"title_en" varchar(150) NOT NULL,
	"description_ar" text,
	"description_en" text,
	"discount_percentage" numeric(5, 2) NOT NULL,
	"promo_code" varchar(50),
	"banner_color" varchar(30),
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"service_id" varchar(50) NOT NULL,
	"title_ar" varchar(150) NOT NULL,
	"title_en" varchar(150) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"item_total" numeric(10, 2) NOT NULL,
	"unit_ar" varchar(30),
	"unit_en" varchar(30),
	"is_home_service" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar(50) NOT NULL,
	"status" "order_status" NOT NULL,
	"changed_by_user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"customer_name" varchar(100) NOT NULL,
	"customer_phone" varchar(15) NOT NULL,
	"service_category_id" varchar(50) NOT NULL,
	"provider_id" varchar(50),
	"provider_name" varchar(150),
	"provider_phone" varchar(15),
	"pickup_address" text,
	"pickup_latitude" double precision,
	"pickup_longitude" double precision,
	"delivery_city" varchar(50) DEFAULT 'عمان' NOT NULL,
	"delivery_area" varchar(100) NOT NULL,
	"delivery_street_address" text NOT NULL,
	"delivery_building" varchar(30),
	"delivery_floor" varchar(20),
	"delivery_apartment" varchar(20),
	"delivery_instructions" text,
	"delivery_latitude" double precision NOT NULL,
	"delivery_longitude" double precision NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"delivery_fee" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"coupon_id" varchar(50),
	"payment_method" varchar(50) DEFAULT 'cash_on_delivery' NOT NULL,
	"status" "order_status" DEFAULT 'confirmed' NOT NULL,
	"assignment_status" "delivery_assignment_status" DEFAULT 'unassigned' NOT NULL,
	"offered_to_driver_id" varchar(50),
	"offer_expires_at" timestamp with time zone,
	"rejected_driver_ids" text[] DEFAULT '{}' NOT NULL,
	"assigned_delivery_id" varchar(50),
	"assigned_delivery_name" varchar(100),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_ar" varchar(150) NOT NULL,
	"title_en" varchar(150) NOT NULL,
	"body_ar" text NOT NULL,
	"body_en" text NOT NULL,
	"data_payload" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_coverage_areas" ADD CONSTRAINT "provider_coverage_areas_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_service_categories" ADD CONSTRAINT "provider_service_categories_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_service_categories" ADD CONSTRAINT "provider_service_categories_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_delivery_employee_id_delivery_employees_id_fk" FOREIGN KEY ("delivery_employee_id") REFERENCES "public"."delivery_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_category_capabilities" ADD CONSTRAINT "delivery_category_capabilities_delivery_employee_id_delivery_employees_id_fk" FOREIGN KEY ("delivery_employee_id") REFERENCES "public"."delivery_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_category_capabilities" ADD CONSTRAINT "delivery_category_capabilities_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_employees" ADD CONSTRAINT "delivery_employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_employees" ADD CONSTRAINT "delivery_employees_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_service_capabilities" ADD CONSTRAINT "delivery_service_capabilities_delivery_employee_id_delivery_employees_id_fk" FOREIGN KEY ("delivery_employee_id") REFERENCES "public"."delivery_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_service_capabilities" ADD CONSTRAINT "delivery_service_capabilities_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_category_id_service_categories_id_fk" FOREIGN KEY ("service_category_id") REFERENCES "public"."service_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_offered_to_driver_id_delivery_employees_id_fk" FOREIGN KEY ("offered_to_driver_id") REFERENCES "public"."delivery_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_delivery_id_delivery_employees_id_fk" FOREIGN KEY ("assigned_delivery_id") REFERENCES "public"."delivery_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_otps_phone" ON "auth_otps" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "idx_auth_otps_active" ON "auth_otps" USING btree ("phone_number","is_consumed","expires_at");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_active" ON "refresh_tokens" USING btree ("user_id","is_revoked");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_phone" ON "users" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_suspended" ON "users" USING btree ("is_suspended");--> statement-breakpoint
CREATE INDEX "idx_categories_active_order" ON "service_categories" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "idx_prov_coverage_provider" ON "provider_coverage_areas" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_prov_coverage_area" ON "provider_coverage_areas" USING btree ("area_name");--> statement-breakpoint
CREATE INDEX "idx_prov_cat_category" ON "provider_service_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_providers_active" ON "providers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_providers_coords" ON "providers" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_services_category" ON "services" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_services_active_available" ON "services" USING btree ("is_active","is_available");--> statement-breakpoint
CREATE INDEX "idx_services_type" ON "services" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_addresses_user_default" ON "addresses" USING btree ("user_id","is_default");--> statement-breakpoint
CREATE INDEX "idx_addresses_coords" ON "addresses" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_assignments_order" ON "delivery_assignments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_assignments_driver" ON "delivery_assignments" USING btree ("delivery_employee_id");--> statement-breakpoint
CREATE INDEX "idx_assignments_status" ON "delivery_assignments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_drv_cat_category" ON "delivery_category_capabilities" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_delivery_online_active" ON "delivery_employees" USING btree ("is_online","is_active");--> statement-breakpoint
CREATE INDEX "idx_delivery_coords" ON "delivery_employees" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "idx_delivery_user" ON "delivery_employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_drv_srv_service" ON "delivery_service_capabilities" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_usage_user" ON "coupon_usages" USING btree ("user_id","coupon_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_usage_order" ON "coupon_usages" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_coupons_code_active" ON "coupons" USING btree ("code","is_active");--> statement-breakpoint
CREATE INDEX "idx_offers_active_dates" ON "offers" USING btree ("is_active","start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_service" ON "order_items" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_order_history_order" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_history_created" ON "order_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_assigned_driver" ON "orders" USING btree ("assigned_delivery_id");--> statement-breakpoint
CREATE INDEX "idx_orders_offered_driver" ON "orders" USING btree ("offered_to_driver_id");--> statement-breakpoint
CREATE INDEX "idx_orders_service_cat" ON "orders" USING btree ("service_category_id");--> statement-breakpoint
CREATE INDEX "idx_orders_provider" ON "orders" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");