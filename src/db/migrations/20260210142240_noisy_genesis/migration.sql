CREATE TABLE "cloud"."change_request_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"change_type" varchar(10) NOT NULL,
	"date" varchar(10) NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."email_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"old_email" varchar(255) NOT NULL,
	"new_email" varchar(255),
	"identity_verification_id" uuid,
	"new_email_verification_id" uuid,
	"is_completed" boolean DEFAULT false NOT NULL,
	"revert_token" uuid,
	"revert_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"reverted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cloud"."phone_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"old_phone" varchar(20) NOT NULL,
	"old_phone_country" varchar(5),
	"new_phone" varchar(20),
	"new_phone_country" varchar(5),
	"identity_verification_id" uuid,
	"new_phone_verification_id" uuid,
	"is_completed" boolean DEFAULT false NOT NULL,
	"revert_token" uuid,
	"revert_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"reverted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud"."sessions" ALTER COLUMN "refresh_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."sessions" ALTER COLUMN "refresh_token_expires_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "change_request_rate_limits_user_id_idx" ON "cloud"."change_request_rate_limits" ("user_id");--> statement-breakpoint
CREATE INDEX "change_request_rate_limits_user_type_date_idx" ON "cloud"."change_request_rate_limits" ("user_id","change_type","date");--> statement-breakpoint
CREATE INDEX "email_change_requests_user_id_idx" ON "cloud"."email_change_requests" ("user_id");--> statement-breakpoint
CREATE INDEX "phone_change_requests_user_id_idx" ON "cloud"."phone_change_requests" ("user_id");--> statement-breakpoint
ALTER TABLE "cloud"."change_request_rate_limits" ADD CONSTRAINT "change_request_rate_limits_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" ADD CONSTRAINT "email_change_requests_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" ADD CONSTRAINT "email_change_requests_sb1CcOZGzeg9_fkey" FOREIGN KEY ("identity_verification_id") REFERENCES "cloud"."email_verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" ADD CONSTRAINT "email_change_requests_spyNFvaMwkQE_fkey" FOREIGN KEY ("new_email_verification_id") REFERENCES "cloud"."email_verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" ADD CONSTRAINT "phone_change_requests_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" ADD CONSTRAINT "phone_change_requests_AwRcQcnhe64P_fkey" FOREIGN KEY ("identity_verification_id") REFERENCES "cloud"."mobile_verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" ADD CONSTRAINT "phone_change_requests_eW9xEDzbTZB2_fkey" FOREIGN KEY ("new_phone_verification_id") REFERENCES "cloud"."mobile_verifications"("id") ON DELETE SET NULL;