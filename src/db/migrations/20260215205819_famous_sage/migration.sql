CREATE TYPE "cloud"."verification_channel" AS ENUM('EMAIL', 'SMS');--> statement-breakpoint
CREATE TABLE "cloud"."verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"channel" "cloud"."verification_channel" NOT NULL,
	"target" varchar(255) NOT NULL,
	"otp" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" DROP CONSTRAINT "email_change_requests_spyNFvaMwkQE_fkey";--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" DROP CONSTRAINT "phone_change_requests_AwRcQcnhe64P_fkey";--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" DROP CONSTRAINT "phone_change_requests_eW9xEDzbTZB2_fkey";--> statement-breakpoint
DROP TABLE "cloud"."email_verifications";--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" RENAME CONSTRAINT "email_change_requests_sb1CcOZGzeg9_fkey" TO "email_change_requests_QFJ7gz9kmHX4_fkey";--> statement-breakpoint
ALTER TABLE "cloud"."mobile_verifications" ADD COLUMN "verification_id" uuid;--> statement-breakpoint
ALTER TABLE "cloud"."password_resets" ADD COLUMN "verification_id" uuid;--> statement-breakpoint
ALTER TABLE "cloud"."password_resets" DROP COLUMN "otp";--> statement-breakpoint
ALTER TABLE "cloud"."password_resets" DROP COLUMN "attempts";--> statement-breakpoint
ALTER TABLE "cloud"."password_resets" DROP COLUMN "is_verified";--> statement-breakpoint
ALTER TABLE "cloud"."password_resets" DROP COLUMN "expires_at";--> statement-breakpoint
ALTER TABLE "cloud"."password_resets" DROP COLUMN "verified_at";--> statement-breakpoint
CREATE INDEX "verifications_user_id_idx" ON "cloud"."verifications" ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_user_id_channel_target_idx" ON "cloud"."verifications" ("user_id","channel","target");--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" ADD CONSTRAINT "email_change_requests_oEKlRXpNOIxn_fkey" FOREIGN KEY ("new_email_verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."mobile_verifications" ADD CONSTRAINT "mobile_verifications_verification_id_verifications_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."password_resets" ADD CONSTRAINT "password_resets_verification_id_verifications_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" ADD CONSTRAINT "phone_change_requests_QFJ7gz9gGf2I_fkey" FOREIGN KEY ("identity_verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" ADD CONSTRAINT "phone_change_requests_2weMc6AIXEN3_fkey" FOREIGN KEY ("new_phone_verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."verifications" ADD CONSTRAINT "verifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" DROP CONSTRAINT "email_change_requests_QFJ7gz9kmHX4_fkey", ADD CONSTRAINT "email_change_requests_QFJ7gz9kmHX4_fkey" FOREIGN KEY ("identity_verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;