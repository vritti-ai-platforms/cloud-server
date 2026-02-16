ALTER TABLE "cloud"."users" ADD COLUMN "full_name" varchar(255);--> statement-breakpoint
ALTER TABLE "cloud"."users" ADD COLUMN "display_name" varchar(100);--> statement-breakpoint
ALTER TABLE "cloud"."users" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "cloud"."users" DROP COLUMN "last_name";