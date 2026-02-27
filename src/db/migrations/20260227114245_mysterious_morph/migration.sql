CREATE TABLE "cloud"."region_providers" (
	"region_id" uuid,
	"provider_id" uuid,
	CONSTRAINT "region_providers_pkey" PRIMARY KEY("region_id","provider_id")
);
--> statement-breakpoint
ALTER TABLE "cloud"."region_providers" ADD CONSTRAINT "region_providers_region_id_regions_id_fkey" FOREIGN KEY ("region_id") REFERENCES "cloud"."regions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."region_providers" ADD CONSTRAINT "region_providers_provider_id_providers_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "cloud"."providers"("id") ON DELETE CASCADE;