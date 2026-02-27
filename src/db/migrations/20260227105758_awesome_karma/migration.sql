CREATE TABLE "cloud"."regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL UNIQUE,
	"state" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud"."providers" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "cloud"."providers" DROP COLUMN "state";