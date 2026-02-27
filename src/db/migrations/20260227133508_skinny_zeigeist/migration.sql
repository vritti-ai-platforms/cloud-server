CREATE TABLE "cloud"."cloud_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cloud"."region_cloud_providers" (
	"region_id" uuid,
	"cloud_provider_id" uuid,
	CONSTRAINT "region_cloud_providers_pkey" PRIMARY KEY("region_id","cloud_provider_id")
);
--> statement-breakpoint
ALTER TABLE "cloud"."prices" DROP CONSTRAINT "prices_provider_id_providers_id_fkey";--> statement-breakpoint
ALTER TABLE "cloud"."region_providers" DROP CONSTRAINT "region_providers_provider_id_providers_id_fkey";--> statement-breakpoint
DROP TABLE "cloud"."providers";--> statement-breakpoint
DROP TABLE "cloud"."region_providers";--> statement-breakpoint
ALTER TABLE "cloud"."prices" ADD COLUMN "cloud_provider_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."prices" DROP COLUMN "provider_id";--> statement-breakpoint
ALTER TABLE "cloud"."prices" ADD CONSTRAINT "prices_cloud_provider_id_cloud_providers_id_fkey" FOREIGN KEY ("cloud_provider_id") REFERENCES "cloud"."cloud_providers"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."region_cloud_providers" ADD CONSTRAINT "region_cloud_providers_region_id_regions_id_fkey" FOREIGN KEY ("region_id") REFERENCES "cloud"."regions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."region_cloud_providers" ADD CONSTRAINT "region_cloud_providers_LRAndYB1ZHnO_fkey" FOREIGN KEY ("cloud_provider_id") REFERENCES "cloud"."cloud_providers"("id") ON DELETE CASCADE;