CREATE SCHEMA "cloud";
--> statement-breakpoint
CREATE TYPE "cloud"."AccountStatus" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "cloud"."DatabaseType" AS ENUM('SHARED', 'DEDICATED');--> statement-breakpoint
CREATE TYPE "cloud"."OAuthProviderType" AS ENUM('GOOGLE', 'MICROSOFT', 'APPLE', 'FACEBOOK', 'X');--> statement-breakpoint
CREATE TYPE "cloud"."OnboardingStep" AS ENUM('EMAIL_VERIFICATION', 'SET_PASSWORD', 'MOBILE_VERIFICATION', 'TWO_FACTOR_SETUP', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "cloud"."SessionType" AS ENUM('ONBOARDING', 'CLOUD');--> statement-breakpoint
CREATE TYPE "cloud"."TenantStatus" AS ENUM('ACTIVE', 'SUSPENDED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "cloud"."TwoFactorMethod" AS ENUM('TOTP', 'PASSKEY');--> statement-breakpoint
CREATE TYPE "cloud"."VerificationMethod" AS ENUM('WHATSAPP_QR', 'SMS_QR', 'MANUAL_OTP');--> statement-breakpoint
CREATE TABLE "cloud"."oauth_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" "cloud"."OAuthProviderType" NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"email" varchar(255),
	"display_name" varchar(255),
	"profile_picture_url" text,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_providers_provider_provider_id_key" UNIQUE("provider","provider_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"state_token" varchar(512) NOT NULL UNIQUE,
	"provider" "cloud"."OAuthProviderType" NOT NULL,
	"user_id" uuid,
	"code_verifier" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"type" "cloud"."SessionType" DEFAULT 'CLOUD'::"cloud"."SessionType" NOT NULL,
	"access_token" varchar(2048) NOT NULL UNIQUE,
	"refresh_token" varchar(2048) UNIQUE,
	"token_type" varchar(50) DEFAULT 'Bearer' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"refresh_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."tenant_database_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"db_host" varchar(255) NOT NULL,
	"db_port" integer NOT NULL,
	"db_username" varchar(255) NOT NULL,
	"db_password" varchar(255) NOT NULL,
	"db_name" varchar(255) NOT NULL,
	"db_schema" varchar(255),
	"db_ssl_mode" varchar(50) DEFAULT 'require' NOT NULL,
	"connection_pool_size" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subdomain" varchar(255) NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"description" text,
	"db_type" "cloud"."DatabaseType" DEFAULT 'SHARED'::"cloud"."DatabaseType" NOT NULL,
	"status" "cloud"."TenantStatus" DEFAULT 'ACTIVE'::"cloud"."TenantStatus" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" varchar(255) NOT NULL UNIQUE,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"password_hash" varchar(255),
	"account_status" "cloud"."AccountStatus" DEFAULT 'PENDING_VERIFICATION'::"cloud"."AccountStatus" NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"onboarding_step" "cloud"."OnboardingStep" DEFAULT 'EMAIL_VERIFICATION'::"cloud"."OnboardingStep" NOT NULL,
	"phone" varchar(20),
	"phone_country" varchar(5),
	"profile_picture_url" text,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"phone_verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cloud"."email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cloud"."mobile_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"phone_country" varchar(5) NOT NULL,
	"method" "cloud"."VerificationMethod" NOT NULL,
	"otp" varchar(255),
	"attempts" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"qr_code" text,
	"qr_scanned_at" timestamp with time zone,
	"qr_verification_id" varchar(255) UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cloud"."two_factor_auth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"method" "cloud"."TwoFactorMethod" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"totp_secret" varchar(255),
	"totp_backup_codes" text,
	"passkey_credential_id" varchar(255) UNIQUE,
	"passkey_public_key" text,
	"passkey_counter" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "oauth_providers_user_id_provider_idx" ON "cloud"."oauth_providers" ("user_id","provider");--> statement-breakpoint
CREATE INDEX "oauth_states_state_token_idx" ON "cloud"."oauth_states" ("state_token");--> statement-breakpoint
CREATE INDEX "oauth_states_expires_at_idx" ON "cloud"."oauth_states" ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_active_idx" ON "cloud"."sessions" ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "sessions_access_token_idx" ON "cloud"."sessions" ("access_token");--> statement-breakpoint
CREATE INDEX "sessions_refresh_token_idx" ON "cloud"."sessions" ("refresh_token");--> statement-breakpoint
CREATE INDEX "email_verifications_user_id_email_idx" ON "cloud"."email_verifications" ("user_id","email");--> statement-breakpoint
CREATE INDEX "mobile_verifications_user_id_phone_idx" ON "cloud"."mobile_verifications" ("user_id","phone");--> statement-breakpoint
CREATE INDEX "mobile_verifications_qr_verification_id_idx" ON "cloud"."mobile_verifications" ("qr_verification_id");--> statement-breakpoint
CREATE INDEX "two_factor_auth_user_id_method_idx" ON "cloud"."two_factor_auth" ("user_id","method");--> statement-breakpoint
ALTER TABLE "cloud"."oauth_providers" ADD CONSTRAINT "oauth_providers_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."tenant_database_configs" ADD CONSTRAINT "tenant_database_configs_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "cloud"."tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."mobile_verifications" ADD CONSTRAINT "mobile_verifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."two_factor_auth" ADD CONSTRAINT "two_factor_auth_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;