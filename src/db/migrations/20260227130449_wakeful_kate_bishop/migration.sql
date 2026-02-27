CREATE TABLE "cloud"."prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"industry_id" uuid NOT NULL,
	"region_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud"."prices" ADD CONSTRAINT "prices_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "cloud"."plans"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."prices" ADD CONSTRAINT "prices_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "cloud"."industries"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."prices" ADD CONSTRAINT "prices_region_id_regions_id_fkey" FOREIGN KEY ("region_id") REFERENCES "cloud"."regions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."prices" ADD CONSTRAINT "prices_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "cloud"."providers"("id") ON DELETE RESTRICT;