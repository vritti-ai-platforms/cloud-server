ALTER TABLE "cloud"."sessions" RENAME COLUMN "access_token" TO "access_token_hash";--> statement-breakpoint
ALTER TABLE "cloud"."sessions" RENAME COLUMN "refresh_token" TO "refresh_token_hash";--> statement-breakpoint
ALTER TABLE "cloud"."sessions" RENAME COLUMN "access_token_expires_at" TO "expires_at";--> statement-breakpoint
DROP INDEX "sessions_user_id_active_idx";--> statement-breakpoint
DROP INDEX "sessions_access_token_idx";--> statement-breakpoint
DROP INDEX "sessions_refresh_token_idx";--> statement-breakpoint
ALTER TABLE "cloud"."sessions" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "cloud"."sessions" DROP COLUMN "refresh_token_expires_at";--> statement-breakpoint
ALTER TABLE "cloud"."sessions" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "cloud"."sessions" ALTER COLUMN "access_token_hash" SET DATA TYPE text USING "access_token_hash"::text;--> statement-breakpoint
ALTER TABLE "cloud"."sessions" ALTER COLUMN "refresh_token_hash" SET DATA TYPE text USING "refresh_token_hash"::text;--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "cloud"."sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_access_token_hash_idx" ON "cloud"."sessions" ("access_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_refresh_token_hash_idx" ON "cloud"."sessions" ("refresh_token_hash");