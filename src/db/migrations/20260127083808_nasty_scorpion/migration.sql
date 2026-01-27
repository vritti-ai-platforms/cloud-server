CREATE TYPE "cloud"."ChatMessageRole" AS ENUM('user', 'assistant', 'tool');--> statement-breakpoint
CREATE TABLE "cloud"."chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"title" varchar(255),
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"conversation_id" uuid NOT NULL,
	"role" "cloud"."ChatMessageRole" NOT NULL,
	"content" text,
	"tool_calls" jsonb,
	"tool_call_id" varchar(255),
	"tool_name" varchar(255),
	"tool_result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cloud"."mobile_verifications" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud"."mobile_verifications" ALTER COLUMN "phone_country" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "chat_conversations_user_id_idx" ON "cloud"."chat_conversations" ("user_id");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_id_idx" ON "cloud"."chat_messages" ("conversation_id");--> statement-breakpoint
ALTER TABLE "cloud"."chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "cloud"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "cloud"."chat_conversations"("id") ON DELETE CASCADE;