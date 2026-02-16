ALTER TABLE "cloud"."oauth_providers" ADD COLUMN "use_profile_picture_url" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."oauth_providers" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "cloud"."oauth_providers" DROP COLUMN "display_name";--> statement-breakpoint
ALTER TABLE "cloud"."users" ALTER COLUMN "full_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."users" ALTER COLUMN "display_name" SET NOT NULL;