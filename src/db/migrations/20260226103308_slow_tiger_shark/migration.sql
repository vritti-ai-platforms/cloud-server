CREATE TYPE "cloud"."MediaStatus" AS ENUM('pending', 'ready', 'failed', 'deleted');--> statement-breakpoint
CREATE TABLE "cloud"."media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"size" bigint NOT NULL,
	"checksum" varchar(128),
	"storage_key" varchar(512) NOT NULL,
	"bucket" varchar(255),
	"provider" varchar(50) NOT NULL,
	"status" "cloud"."MediaStatus" DEFAULT 'pending'::"cloud"."MediaStatus" NOT NULL,
	"entity_type" varchar(255) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"uploaded_by" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud"."organizations" ALTER COLUMN "media_id" SET DATA TYPE varchar(255) USING "media_id"::varchar(255);--> statement-breakpoint
CREATE INDEX "idx_media_entity" ON "cloud"."media" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_media_uploaded_by" ON "cloud"."media" ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_media_status" ON "cloud"."media" ("status");--> statement-breakpoint
CREATE INDEX "idx_media_checksum" ON "cloud"."media" ("checksum");--> statement-breakpoint
CREATE INDEX "idx_media_storage_key" ON "cloud"."media" ("storage_key");