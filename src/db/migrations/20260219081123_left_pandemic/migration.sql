ALTER TYPE "cloud"."TwoFactorMethod" RENAME TO "MfaMethod";--> statement-breakpoint
CREATE TABLE "cloud"."mfa_auth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"method" "cloud"."MfaMethod" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"totp_secret" varchar(255),
	"totp_backup_codes" text,
	"passkey_credential_id" varchar(255) UNIQUE,
	"passkey_public_key" text,
	"passkey_counter" integer,
	"passkey_transports" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
DROP TABLE "cloud"."two_factor_auth";--> statement-breakpoint
CREATE INDEX "mfa_auth_user_id_method_idx" ON "cloud"."mfa_auth" ("user_id","method");--> statement-breakpoint
CREATE UNIQUE INDEX "verifications_user_id_channel_unique" ON "cloud"."verifications" ("user_id","channel");--> statement-breakpoint
ALTER TABLE "cloud"."mfa_auth" ADD CONSTRAINT "mfa_auth_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;