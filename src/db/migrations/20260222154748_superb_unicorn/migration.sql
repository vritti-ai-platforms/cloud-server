ALTER TABLE "cloud"."mfa_auth" ADD COLUMN "is_confirmed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."mfa_auth" ADD COLUMN "pending_challenge" varchar(512);