CREATE SCHEMA "cloud";
--> statement-breakpoint
CREATE TYPE "cloud"."AccountStatus" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "cloud"."DatabaseType" AS ENUM('SHARED', 'DEDICATED');--> statement-breakpoint
CREATE TYPE "cloud"."MfaMethod" AS ENUM('TOTP', 'PASSKEY');--> statement-breakpoint
CREATE TYPE "cloud"."OAuthProviderType" AS ENUM('GOOGLE', 'MICROSOFT', 'APPLE', 'FACEBOOK', 'X');--> statement-breakpoint
CREATE TYPE "cloud"."OnboardingStep" AS ENUM('EMAIL_VERIFICATION', 'SET_PASSWORD', 'MOBILE_VERIFICATION', 'TWO_FACTOR_SETUP', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "cloud"."OrgMemberRole" AS ENUM('Owner', 'Admin');--> statement-breakpoint
CREATE TYPE "cloud"."OrgPlan" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "cloud"."OrgSize" AS ENUM('0-10', '10-20', '20-50', '50-100', '100-500', '500+');--> statement-breakpoint
CREATE TYPE "cloud"."SessionType" AS ENUM('ONBOARDING', 'CLOUD', 'COMPANY', 'RESET');--> statement-breakpoint
CREATE TYPE "cloud"."SignupMethod" AS ENUM('email', 'oauth');--> statement-breakpoint
CREATE TYPE "cloud"."TenantStatus" AS ENUM('ACTIVE', 'SUSPENDED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "cloud"."verification_channel" AS ENUM('EMAIL', 'SMS_OUT', 'SMS_IN', 'WHATSAPP_IN');--> statement-breakpoint
CREATE TABLE "cloud"."oauth_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"provider" "cloud"."OAuthProviderType" NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"profile_picture_url" text,
	"use_profile_picture_url" boolean DEFAULT false NOT NULL,
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
	"access_token_hash" text NOT NULL UNIQUE,
	"refresh_token_hash" text NOT NULL UNIQUE,
	"ip_address" varchar(45),
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "cloud"."OrgMemberRole" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"subdomain" varchar(100) NOT NULL UNIQUE,
	"org_identifier" varchar(100) NOT NULL UNIQUE,
	"industry_id" integer,
	"size" "cloud"."OrgSize" NOT NULL,
	"media_id" integer,
	"plan" "cloud"."OrgPlan" DEFAULT 'free'::"cloud"."OrgPlan" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
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
	"full_name" varchar(255) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"password_hash" varchar(255),
	"signup_method" "cloud"."SignupMethod" DEFAULT 'email'::"cloud"."SignupMethod" NOT NULL,
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
CREATE TABLE "cloud"."mfa_auth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"method" "cloud"."MfaMethod" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_confirmed" boolean DEFAULT true NOT NULL,
	"totp_secret" varchar(255),
	"totp_backup_codes" text,
	"passkey_credential_id" varchar(255) UNIQUE,
	"passkey_public_key" text,
	"passkey_counter" integer,
	"passkey_transports" varchar(255),
	"pending_challenge" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
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
CREATE TABLE "cloud"."verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"channel" "cloud"."verification_channel" NOT NULL,
	"target" varchar(255),
	"hash" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "oauth_providers_user_id_provider_idx" ON "cloud"."oauth_providers" ("user_id","provider");--> statement-breakpoint
CREATE INDEX "oauth_states_state_token_idx" ON "cloud"."oauth_states" ("state_token");--> statement-breakpoint
CREATE INDEX "oauth_states_expires_at_idx" ON "cloud"."oauth_states" ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "cloud"."sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_access_token_hash_idx" ON "cloud"."sessions" ("access_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_refresh_token_hash_idx" ON "cloud"."sessions" ("refresh_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_unique_idx" ON "cloud"."organization_members" ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "change_request_rate_limits_user_id_idx" ON "cloud"."change_request_rate_limits" ("user_id");--> statement-breakpoint
CREATE INDEX "change_request_rate_limits_user_type_date_idx" ON "cloud"."change_request_rate_limits" ("user_id","change_type","date");--> statement-breakpoint
CREATE INDEX "email_change_requests_user_id_idx" ON "cloud"."email_change_requests" ("user_id");--> statement-breakpoint
CREATE INDEX "mfa_auth_user_id_method_idx" ON "cloud"."mfa_auth" ("user_id","method");--> statement-breakpoint
CREATE INDEX "phone_change_requests_user_id_idx" ON "cloud"."phone_change_requests" ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_user_id_idx" ON "cloud"."verifications" ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_user_id_channel_target_idx" ON "cloud"."verifications" ("user_id","channel","target");--> statement-breakpoint
CREATE INDEX "verifications_hash_channel_idx" ON "cloud"."verifications" ("hash","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "verifications_user_id_channel_unique" ON "cloud"."verifications" ("user_id","channel");--> statement-breakpoint
ALTER TABLE "cloud"."oauth_providers" ADD CONSTRAINT "oauth_providers_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "cloud"."organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."tenant_database_configs" ADD CONSTRAINT "tenant_database_configs_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "cloud"."tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."change_request_rate_limits" ADD CONSTRAINT "change_request_rate_limits_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" ADD CONSTRAINT "email_change_requests_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" ADD CONSTRAINT "email_change_requests_QFJ7gz9kmHX4_fkey" FOREIGN KEY ("identity_verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."email_change_requests" ADD CONSTRAINT "email_change_requests_oEKlRXpNOIxn_fkey" FOREIGN KEY ("new_email_verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."mfa_auth" ADD CONSTRAINT "mfa_auth_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" ADD CONSTRAINT "phone_change_requests_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" ADD CONSTRAINT "phone_change_requests_QFJ7gz9gGf2I_fkey" FOREIGN KEY ("identity_verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."phone_change_requests" ADD CONSTRAINT "phone_change_requests_2weMc6AIXEN3_fkey" FOREIGN KEY ("new_phone_verification_id") REFERENCES "cloud"."verifications"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."verifications" ADD CONSTRAINT "verifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;