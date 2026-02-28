CREATE TABLE "cloud"."deployment_industry_plans" (
	"deployment_id" uuid,
	"plan_id" uuid,
	"industry_id" uuid,
	CONSTRAINT "deployment_industry_plans_pkey" PRIMARY KEY("deployment_id","plan_id","industry_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud"."deployments" DROP CONSTRAINT "deployments_cloud_provider_id_cloud_providers_id_fkey";--> statement-breakpoint
ALTER TABLE "cloud"."prices" DROP CONSTRAINT "prices_cloud_provider_id_cloud_providers_id_fkey";--> statement-breakpoint
ALTER TABLE "cloud"."region_cloud_providers" DROP CONSTRAINT "region_cloud_providers_LRAndYB1ZHnO_fkey";--> statement-breakpoint
DROP TABLE "cloud"."cloud_providers";--> statement-breakpoint
ALTER TABLE "cloud"."deployments" ADD CONSTRAINT "deployments_cloud_provider_id_providers_id_fkey" FOREIGN KEY ("cloud_provider_id") REFERENCES "cloud"."providers"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."deployment_industry_plans" ADD CONSTRAINT "deployment_industry_plans_deployment_id_deployments_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "cloud"."deployments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."deployment_industry_plans" ADD CONSTRAINT "deployment_industry_plans_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "cloud"."plans"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."deployment_industry_plans" ADD CONSTRAINT "deployment_industry_plans_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "cloud"."industries"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."prices" ADD CONSTRAINT "prices_cloud_provider_id_providers_id_fkey" FOREIGN KEY ("cloud_provider_id") REFERENCES "cloud"."providers"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."region_cloud_providers" ADD CONSTRAINT "region_cloud_providers_cloud_provider_id_providers_id_fkey" FOREIGN KEY ("cloud_provider_id") REFERENCES "cloud"."providers"("id") ON DELETE CASCADE;