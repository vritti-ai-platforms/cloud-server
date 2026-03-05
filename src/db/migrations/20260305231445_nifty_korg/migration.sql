ALTER TABLE "cloud"."regions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."cloud_providers" DROP COLUMN "is_active";