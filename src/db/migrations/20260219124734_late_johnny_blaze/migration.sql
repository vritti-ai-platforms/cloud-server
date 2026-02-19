ALTER TABLE "cloud"."verifications" RENAME COLUMN "hashed_otp" TO "hash";--> statement-breakpoint
ALTER TABLE "cloud"."verifications" DROP CONSTRAINT "verifications_verification_id_key";--> statement-breakpoint
ALTER INDEX "cloud"."verifications_verification_id_idx" RENAME TO "verifications_hash_channel_idx";--> statement-breakpoint
ALTER TABLE "cloud"."verifications" DROP COLUMN "verification_id";--> statement-breakpoint
ALTER TABLE "cloud"."verifications" ALTER COLUMN "hash" SET NOT NULL;--> statement-breakpoint
DROP INDEX "verifications_hash_channel_idx";--> statement-breakpoint
CREATE INDEX "verifications_hash_channel_idx" ON "cloud"."verifications" ("hash","channel");