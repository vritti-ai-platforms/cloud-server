DROP TABLE "cloud"."mobile_verifications";--> statement-breakpoint
ALTER TABLE "cloud"."verifications" RENAME COLUMN "otp" TO "hashed_otp";--> statement-breakpoint
ALTER TABLE "cloud"."verifications" ADD COLUMN "verification_id" varchar(255);--> statement-breakpoint
ALTER TABLE "cloud"."verifications" ALTER COLUMN "channel" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "cloud"."verification_channel";--> statement-breakpoint
CREATE TYPE "cloud"."verification_channel" AS ENUM('EMAIL', 'SMS_OUT', 'SMS_IN', 'WHATSAPP_IN');--> statement-breakpoint
ALTER TABLE "cloud"."verifications" ALTER COLUMN "channel" SET DATA TYPE "cloud"."verification_channel" USING "channel"::"cloud"."verification_channel";--> statement-breakpoint
ALTER TABLE "cloud"."verifications" ALTER COLUMN "target" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."verifications" ALTER COLUMN "hashed_otp" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."verifications" ADD CONSTRAINT "verifications_verification_id_key" UNIQUE("verification_id");--> statement-breakpoint
CREATE INDEX "verifications_verification_id_idx" ON "cloud"."verifications" ("verification_id");--> statement-breakpoint
DROP TYPE "cloud"."VerificationMethod";