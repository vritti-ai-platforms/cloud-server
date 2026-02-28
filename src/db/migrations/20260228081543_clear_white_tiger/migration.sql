CREATE TABLE "cloud"."cloud_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud"."deployments" DROP CONSTRAINT "deployments_cloud_provider_id_providers_id_fkey";--> statement-breakpoint
ALTER TABLE "cloud"."prices" DROP CONSTRAINT "prices_cloud_provider_id_providers_id_fkey";--> statement-breakpoint
ALTER TABLE "cloud"."region_cloud_providers" DROP CONSTRAINT "region_cloud_providers_cloud_provider_id_providers_id_fkey";--> statement-breakpoint
DROP TABLE "cloud"."providers";--> statement-breakpoint
ALTER TABLE "cloud"."deployments" ADD CONSTRAINT "deployments_cloud_provider_id_cloud_providers_id_fkey" FOREIGN KEY ("cloud_provider_id") REFERENCES "cloud"."cloud_providers"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."prices" ADD CONSTRAINT "prices_cloud_provider_id_cloud_providers_id_fkey" FOREIGN KEY ("cloud_provider_id") REFERENCES "cloud"."cloud_providers"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."region_cloud_providers" ADD CONSTRAINT "region_cloud_providers_LRAndYB1ZHnO_fkey" FOREIGN KEY ("cloud_provider_id") REFERENCES "cloud"."cloud_providers"("id") ON DELETE CASCADE;