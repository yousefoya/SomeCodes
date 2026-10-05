CREATE TABLE "loyalty_settings" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"required_points" integer DEFAULT 200 NOT NULL,
	"reward_type" varchar(50) DEFAULT 'coupon' NOT NULL,
	"reward_value" numeric(10, 2) DEFAULT '5.00' NOT NULL,
	"title_ar" varchar(200) DEFAULT 'خصم 5 د.أ مقابل 200 نقطة ولاء' NOT NULL,
	"title_en" varchar(200) DEFAULT '5 JOD Discount for 200 Loyalty Points' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" varchar(50),
	"type" varchar(50) NOT NULL,
	"points" integer NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_loyalty_user" ON "loyalty_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_order" ON "loyalty_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_created" ON "loyalty_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_loyalty_user_order_reward" ON "loyalty_transactions" USING btree ("user_id","order_id","type");