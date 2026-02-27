CREATE TABLE "cloud"."deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"nexus_url" varchar(500) NOT NULL,
	"webhook_secret" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cloud"."industry_deployments" (
	"industry_id" uuid,
	"deployment_id" uuid,
	CONSTRAINT "industry_deployments_pkey" PRIMARY KEY("industry_id","deployment_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."industry_plans" (
	"industry_id" uuid,
	"plan_id" uuid,
	CONSTRAINT "industry_plans_pkey" PRIMARY KEY("industry_id","plan_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"code" varchar(100) NOT NULL UNIQUE,
	"price" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud"."organizations" RENAME COLUMN "plan" TO "plan_id";--> statement-breakpoint
ALTER TABLE "cloud"."industries" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "cloud"."organizations" ADD COLUMN "deployment_id" uuid;--> statement-breakpoint
ALTER TABLE "cloud"."industries" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
DROP SEQUENCE "cloud"."industries_id_seq";--> statement-breakpoint
ALTER TABLE "cloud"."industries" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint
ALTER TABLE "cloud"."industries" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "cloud"."organizations" ALTER COLUMN "industry_id" SET DATA TYPE uuid USING "industry_id"::uuid;--> statement-breakpoint
ALTER TABLE "cloud"."organizations" ALTER COLUMN "plan_id" SET DATA TYPE uuid USING "plan_id"::uuid;--> statement-breakpoint
ALTER TABLE "cloud"."organizations" ALTER COLUMN "plan_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cloud"."organizations" ALTER COLUMN "plan_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."industry_deployments" ADD CONSTRAINT "industry_deployments_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "cloud"."industries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."industry_deployments" ADD CONSTRAINT "industry_deployments_deployment_id_deployments_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "cloud"."deployments"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."industry_plans" ADD CONSTRAINT "industry_plans_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "cloud"."industries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."industry_plans" ADD CONSTRAINT "industry_plans_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "cloud"."plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."organizations" ADD CONSTRAINT "organizations_industry_id_industries_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "cloud"."industries"("id");--> statement-breakpoint
ALTER TABLE "cloud"."organizations" ADD CONSTRAINT "organizations_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "cloud"."plans"("id");--> statement-breakpoint
ALTER TABLE "cloud"."organizations" ADD CONSTRAINT "organizations_deployment_id_deployments_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "cloud"."deployments"("id");--> statement-breakpoint
DROP TYPE "cloud"."OrgPlan";