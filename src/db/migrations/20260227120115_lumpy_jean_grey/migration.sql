ALTER TABLE "cloud"."industries" ADD COLUMN "code" varchar(100);--> statement-breakpoint
ALTER TABLE "cloud"."industries" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."industries" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cloud"."industries" ALTER COLUMN "name" SET DATA TYPE varchar(255) USING "name"::varchar(255);--> statement-breakpoint
UPDATE "cloud"."industries" SET "code" = "slug" WHERE "code" IS NULL;--> statement-breakpoint
ALTER TABLE "cloud"."industries" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."industries" ADD CONSTRAINT "industries_code_key" UNIQUE("code");