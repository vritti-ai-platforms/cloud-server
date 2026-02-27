CREATE TYPE "cloud"."DeploymentStatus" AS ENUM('active', 'stopped', 'Provisioning');--> statement-breakpoint
CREATE TYPE "cloud"."DeploymentType" AS ENUM('shared', 'dedicated');--> statement-breakpoint
ALTER TABLE "cloud"."deployments" ADD COLUMN "region_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."deployments" ADD COLUMN "cloud_provider_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."deployments" ADD COLUMN "status" "cloud"."DeploymentStatus" DEFAULT 'Provisioning'::"cloud"."DeploymentStatus" NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."deployments" ADD COLUMN "type" "cloud"."DeploymentType" NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."deployments" ADD CONSTRAINT "deployments_region_id_regions_id_fkey" FOREIGN KEY ("region_id") REFERENCES "cloud"."regions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "cloud"."deployments" ADD CONSTRAINT "deployments_cloud_provider_id_cloud_providers_id_fkey" FOREIGN KEY ("cloud_provider_id") REFERENCES "cloud"."cloud_providers"("id") ON DELETE RESTRICT;