CREATE TABLE "cloud"."table_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"table_slug" varchar(100) NOT NULL,
	"name" varchar(100),
	"state" jsonb NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "table_views_user_table_idx" ON "cloud"."table_views" ("user_id","table_slug");--> statement-breakpoint
CREATE INDEX "table_views_shared_slug_idx" ON "cloud"."table_views" ("table_slug","is_shared");--> statement-breakpoint
CREATE UNIQUE INDEX "table_views_user_table_name_unique" ON "cloud"."table_views" ("user_id","table_slug","name");--> statement-breakpoint
ALTER TABLE "cloud"."table_views" ADD CONSTRAINT "table_views_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;