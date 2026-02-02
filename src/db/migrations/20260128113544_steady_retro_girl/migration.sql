CREATE TYPE "cloud"."AppCategory" AS ENUM('SALES', 'FINANCE', 'OPERATIONS', 'COMMUNICATION', 'ANALYTICS', 'HR');--> statement-breakpoint
CREATE TYPE "cloud"."AppStatus" AS ENUM('ACTIVE', 'SUSPENDED', 'TRIAL', 'DISABLED');--> statement-breakpoint
CREATE TYPE "cloud"."BusinessUnitStatus" AS ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "cloud"."BusinessUnitType" AS ENUM('OUTLET', 'CLINIC', 'WAREHOUSE', 'HUB', 'HQ', 'OFFICE', 'OTHER');--> statement-breakpoint
CREATE TYPE "cloud"."CompanySize" AS ENUM('SIZE_1_10', 'SIZE_11_50', 'SIZE_51_200', 'SIZE_200_PLUS');--> statement-breakpoint
CREATE TYPE "cloud"."DatabaseHealth" AS ENUM('HEALTHY', 'DEGRADED', 'DOWN');--> statement-breakpoint
CREATE TYPE "cloud"."DatabaseRegion" AS ENUM('AP_SOUTH_1', 'AP_SOUTHEAST_1', 'EU_CENTRAL_1', 'US_EAST_1');--> statement-breakpoint
CREATE TYPE "cloud"."IndustryType" AS ENUM('HEALTHCARE', 'RETAIL', 'FOOD_AND_BEVERAGE', 'PROFESSIONAL_SERVICES', 'MANUFACTURING', 'EDUCATION', 'TECHNOLOGY', 'OTHER');--> statement-breakpoint
CREATE TYPE "cloud"."InvitationStatus" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "cloud"."MembershipStatus" AS ENUM('ACTIVE', 'SUSPENDED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "cloud"."PricingType" AS ENUM('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE');--> statement-breakpoint
CREATE TABLE "cloud"."business_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"type" "cloud"."BusinessUnitType" DEFAULT 'OFFICE'::"cloud"."BusinessUnitType" NOT NULL,
	"description" text,
	"status" "cloud"."BusinessUnitStatus" DEFAULT 'ACTIVE'::"cloud"."BusinessUnitStatus" NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"manager_id" uuid,
	"employees_count" integer DEFAULT 0 NOT NULL,
	"enabled_apps_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"industry" "cloud"."IndustryType" NOT NULL,
	"size" "cloud"."CompanySize" NOT NULL,
	"logo_url" text,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"db_region" "cloud"."DatabaseRegion",
	"db_health" "cloud"."DatabaseHealth" DEFAULT 'HEALTHY'::"cloud"."DatabaseHealth" NOT NULL,
	"last_health_check_at" timestamp with time zone,
	"users_count" integer DEFAULT 0 NOT NULL,
	"business_units_count" integer DEFAULT 0 NOT NULL,
	"enabled_apps_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL UNIQUE,
	"icon" varchar(50) NOT NULL,
	"description" text,
	"category" "cloud"."AppCategory" NOT NULL,
	"pricing_tier" "cloud"."PricingType" DEFAULT 'FREE'::"cloud"."PricingType" NOT NULL,
	"monthly_price" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"recommended_industries" text,
	"dependencies" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"role_id" uuid NOT NULL,
	"permission_code" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_unique" UNIQUE("role_id","permission_code")
);
--> statement-breakpoint
CREATE TABLE "cloud"."roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7),
	"icon" varchar(50),
	"is_system" boolean DEFAULT false NOT NULL,
	"user_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_company_name_unique" UNIQUE("company_id","name")
);
--> statement-breakpoint
CREATE TABLE "cloud"."company_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "cloud"."MembershipStatus" DEFAULT 'ACTIVE'::"cloud"."MembershipStatus" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_members_unique" UNIQUE("company_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."member_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_member_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_roles_unique" UNIQUE("company_member_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."business_unit_member_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"business_unit_member_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bu_member_roles_unique" UNIQUE("business_unit_member_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."business_unit_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"business_unit_id" uuid NOT NULL,
	"company_member_id" uuid NOT NULL,
	"title" varchar(100),
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" "cloud"."MembershipStatus" DEFAULT 'ACTIVE'::"cloud"."MembershipStatus" NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_unit_members_unique" UNIQUE("business_unit_id","company_member_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL UNIQUE,
	"message" text,
	"role_id" uuid NOT NULL,
	"additional_role_ids" text,
	"business_unit_id" uuid,
	"status" "cloud"."InvitationStatus" DEFAULT 'PENDING'::"cloud"."InvitationStatus" NOT NULL,
	"invited_by" uuid NOT NULL,
	"invitee_user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."business_unit_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"business_unit_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"status" "cloud"."AppStatus" DEFAULT 'ACTIVE'::"cloud"."AppStatus" NOT NULL,
	"enabled_by" uuid,
	"enabled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_unit_apps_unique" UNIQUE("business_unit_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."company_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"status" "cloud"."AppStatus" DEFAULT 'ACTIVE'::"cloud"."AppStatus" NOT NULL,
	"enabled_by" uuid,
	"enabled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_apps_unique" UNIQUE("company_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_id" uuid,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"changes" jsonb,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "business_units_company_id_idx" ON "cloud"."business_units" ("company_id");--> statement-breakpoint
CREATE INDEX "business_units_status_idx" ON "cloud"."business_units" ("status");--> statement-breakpoint
CREATE INDEX "companies_tenant_id_idx" ON "cloud"."companies" ("tenant_id");--> statement-breakpoint
CREATE INDEX "companies_industry_idx" ON "cloud"."companies" ("industry");--> statement-breakpoint
CREATE INDEX "apps_slug_idx" ON "cloud"."apps" ("slug");--> statement-breakpoint
CREATE INDEX "apps_category_idx" ON "cloud"."apps" ("category");--> statement-breakpoint
CREATE INDEX "apps_pricing_tier_idx" ON "cloud"."apps" ("pricing_tier");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "cloud"."role_permissions" ("role_id");--> statement-breakpoint
CREATE INDEX "role_permissions_code_idx" ON "cloud"."role_permissions" ("permission_code");--> statement-breakpoint
CREATE INDEX "roles_company_id_idx" ON "cloud"."roles" ("company_id");--> statement-breakpoint
CREATE INDEX "roles_is_system_idx" ON "cloud"."roles" ("is_system");--> statement-breakpoint
CREATE INDEX "company_members_company_id_idx" ON "cloud"."company_members" ("company_id");--> statement-breakpoint
CREATE INDEX "company_members_user_id_idx" ON "cloud"."company_members" ("user_id");--> statement-breakpoint
CREATE INDEX "company_members_status_idx" ON "cloud"."company_members" ("status");--> statement-breakpoint
CREATE INDEX "member_roles_member_id_idx" ON "cloud"."member_roles" ("company_member_id");--> statement-breakpoint
CREATE INDEX "member_roles_role_id_idx" ON "cloud"."member_roles" ("role_id");--> statement-breakpoint
CREATE INDEX "bu_member_roles_bu_member_id_idx" ON "cloud"."business_unit_member_roles" ("business_unit_member_id");--> statement-breakpoint
CREATE INDEX "bu_member_roles_role_id_idx" ON "cloud"."business_unit_member_roles" ("role_id");--> statement-breakpoint
CREATE INDEX "business_unit_members_bu_id_idx" ON "cloud"."business_unit_members" ("business_unit_id");--> statement-breakpoint
CREATE INDEX "business_unit_members_member_id_idx" ON "cloud"."business_unit_members" ("company_member_id");--> statement-breakpoint
CREATE INDEX "business_unit_members_primary_idx" ON "cloud"."business_unit_members" ("is_primary");--> statement-breakpoint
CREATE INDEX "invitations_company_id_idx" ON "cloud"."invitations" ("company_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "cloud"."invitations" ("email");--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "cloud"."invitations" ("token");--> statement-breakpoint
CREATE INDEX "invitations_status_idx" ON "cloud"."invitations" ("status");--> statement-breakpoint
CREATE INDEX "invitations_invited_by_idx" ON "cloud"."invitations" ("invited_by");--> statement-breakpoint
CREATE INDEX "business_unit_apps_bu_id_idx" ON "cloud"."business_unit_apps" ("business_unit_id");--> statement-breakpoint
CREATE INDEX "business_unit_apps_app_id_idx" ON "cloud"."business_unit_apps" ("app_id");--> statement-breakpoint
CREATE INDEX "business_unit_apps_status_idx" ON "cloud"."business_unit_apps" ("status");--> statement-breakpoint
CREATE INDEX "company_apps_company_id_idx" ON "cloud"."company_apps" ("company_id");--> statement-breakpoint
CREATE INDEX "company_apps_app_id_idx" ON "cloud"."company_apps" ("app_id");--> statement-breakpoint
CREATE INDEX "company_apps_status_idx" ON "cloud"."company_apps" ("status");--> statement-breakpoint
CREATE INDEX "activity_logs_company_id_idx" ON "cloud"."activity_logs" ("company_id");--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "cloud"."activity_logs" ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "cloud"."activity_logs" ("action");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_type_idx" ON "cloud"."activity_logs" ("entity_type");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_id_idx" ON "cloud"."activity_logs" ("entity_id");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "cloud"."activity_logs" ("created_at");--> statement-breakpoint
ALTER TABLE "cloud"."business_units" ADD CONSTRAINT "business_units_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cloud"."companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."companies" ADD CONSTRAINT "companies_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "cloud"."tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "cloud"."roles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."roles" ADD CONSTRAINT "roles_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cloud"."companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cloud"."companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."company_members" ADD CONSTRAINT "company_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."company_members" ADD CONSTRAINT "company_members_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "cloud"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."member_roles" ADD CONSTRAINT "member_roles_company_member_id_company_members_id_fkey" FOREIGN KEY ("company_member_id") REFERENCES "cloud"."company_members"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."member_roles" ADD CONSTRAINT "member_roles_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "cloud"."roles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."member_roles" ADD CONSTRAINT "member_roles_assigned_by_company_members_id_fkey" FOREIGN KEY ("assigned_by") REFERENCES "cloud"."company_members"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."business_unit_member_roles" ADD CONSTRAINT "business_unit_member_roles_h5lqrZ1Zi6Ul_fkey" FOREIGN KEY ("business_unit_member_id") REFERENCES "cloud"."business_unit_members"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."business_unit_member_roles" ADD CONSTRAINT "business_unit_member_roles_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "cloud"."roles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."business_unit_member_roles" ADD CONSTRAINT "business_unit_member_roles_assigned_by_company_members_id_fkey" FOREIGN KEY ("assigned_by") REFERENCES "cloud"."company_members"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."business_unit_members" ADD CONSTRAINT "business_unit_members_business_unit_id_business_units_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "cloud"."business_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."business_unit_members" ADD CONSTRAINT "business_unit_members_company_member_id_company_members_id_fkey" FOREIGN KEY ("company_member_id") REFERENCES "cloud"."company_members"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."business_unit_members" ADD CONSTRAINT "business_unit_members_assigned_by_company_members_id_fkey" FOREIGN KEY ("assigned_by") REFERENCES "cloud"."company_members"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."invitations" ADD CONSTRAINT "invitations_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cloud"."companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."invitations" ADD CONSTRAINT "invitations_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "cloud"."roles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."invitations" ADD CONSTRAINT "invitations_business_unit_id_business_units_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "cloud"."business_units"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fkey" FOREIGN KEY ("invited_by") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."invitations" ADD CONSTRAINT "invitations_invitee_user_id_users_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "cloud"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."business_unit_apps" ADD CONSTRAINT "business_unit_apps_business_unit_id_business_units_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "cloud"."business_units"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."business_unit_apps" ADD CONSTRAINT "business_unit_apps_app_id_apps_id_fkey" FOREIGN KEY ("app_id") REFERENCES "cloud"."apps"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."business_unit_apps" ADD CONSTRAINT "business_unit_apps_enabled_by_company_members_id_fkey" FOREIGN KEY ("enabled_by") REFERENCES "cloud"."company_members"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."company_apps" ADD CONSTRAINT "company_apps_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cloud"."companies"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."company_apps" ADD CONSTRAINT "company_apps_app_id_apps_id_fkey" FOREIGN KEY ("app_id") REFERENCES "cloud"."apps"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."company_apps" ADD CONSTRAINT "company_apps_enabled_by_company_members_id_fkey" FOREIGN KEY ("enabled_by") REFERENCES "cloud"."company_members"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."activity_logs" ADD CONSTRAINT "activity_logs_company_id_companies_id_fkey" FOREIGN KEY ("company_id") REFERENCES "cloud"."companies"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE SET NULL;