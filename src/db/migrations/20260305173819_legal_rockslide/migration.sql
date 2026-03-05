DROP INDEX "table_views_user_table_name_unique";--> statement-breakpoint
ALTER TABLE "cloud"."cloud_providers" ADD COLUMN "logo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "cloud"."cloud_providers" ADD COLUMN "logo_dark_url" varchar(500);--> statement-breakpoint
ALTER TABLE "cloud"."cloud_providers" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."table_views" DROP COLUMN "is_current";--> statement-breakpoint
ALTER TABLE "cloud"."table_views" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "table_views_user_table_name_shared_unique" ON "cloud"."table_views" ("user_id","table_slug","name","is_shared");