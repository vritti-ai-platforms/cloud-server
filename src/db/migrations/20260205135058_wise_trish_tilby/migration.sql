CREATE TABLE "cloud"."password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp" varchar(255) NOT NULL,
	"reset_token" varchar(255),
	"attempts" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud"."mobile_verifications" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."mobile_verifications" ALTER COLUMN "phone_country" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "password_resets_user_id_email_idx" ON "cloud"."password_resets" ("user_id","email");--> statement-breakpoint
ALTER TABLE "cloud"."password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;