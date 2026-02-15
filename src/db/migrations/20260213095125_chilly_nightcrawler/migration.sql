CREATE TYPE "cloud"."ChannelType" AS ENUM('TELEGRAM', 'INSTAGRAM', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "cloud"."ConversationStatus" AS ENUM('OPEN', 'RESOLVED', 'PENDING', 'SNOOZED');--> statement-breakpoint
CREATE TYPE "cloud"."InboxStatus" AS ENUM('ACTIVE', 'PENDING', 'DISCONNECTED', 'ERROR');--> statement-breakpoint
CREATE TYPE "cloud"."MessageSenderType" AS ENUM('CONTACT', 'USER');--> statement-breakpoint
CREATE TYPE "cloud"."MessageStatus" AS ENUM('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');--> statement-breakpoint
CREATE TYPE "cloud"."MessageType" AS ENUM('TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO');--> statement-breakpoint
CREATE TABLE "cloud"."canned_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"short_code" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canned_responses_tenant_id_short_code_key" UNIQUE("tenant_id","short_code")
);
--> statement-breakpoint
CREATE TABLE "cloud"."contact_inboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"contact_id" uuid NOT NULL,
	"inbox_id" uuid NOT NULL,
	"source_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_inboxes_inbox_id_source_id_key" UNIQUE("inbox_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "cloud"."contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"phone" varchar(20),
	"username" varchar(255),
	"email" varchar(255),
	"custom_attributes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"inbox_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"contact_inbox_id" uuid NOT NULL,
	"assigned_agent_id" uuid,
	"status" "cloud"."ConversationStatus" DEFAULT 'OPEN'::"cloud"."ConversationStatus" NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"last_message_content" text,
	"last_message_at" timestamp with time zone,
	"last_message_is_from_contact" boolean,
	"labels" text,
	"snoozed_until" timestamp with time zone,
	"custom_attributes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."inboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"channel_type" "cloud"."ChannelType" NOT NULL,
	"status" "cloud"."InboxStatus" DEFAULT 'PENDING'::"cloud"."InboxStatus" NOT NULL,
	"channel_config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"conversation_id" uuid NOT NULL,
	"content" text NOT NULL,
	"content_type" "cloud"."MessageType" DEFAULT 'TEXT'::"cloud"."MessageType" NOT NULL,
	"sender_type" "cloud"."MessageSenderType" NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_name" varchar(255) NOT NULL,
	"status" "cloud"."MessageStatus" DEFAULT 'SENT'::"cloud"."MessageStatus" NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"content_attributes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_inboxes_contact_id_idx" ON "cloud"."contact_inboxes" ("contact_id");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_idx" ON "cloud"."contacts" ("tenant_id");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_phone_idx" ON "cloud"."contacts" ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_username_idx" ON "cloud"."contacts" ("tenant_id","username");--> statement-breakpoint
CREATE INDEX "conversations_tenant_id_status_idx" ON "cloud"."conversations" ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "conversations_inbox_id_idx" ON "cloud"."conversations" ("inbox_id");--> statement-breakpoint
CREATE INDEX "conversations_contact_id_idx" ON "cloud"."conversations" ("contact_id");--> statement-breakpoint
CREATE INDEX "conversations_assigned_agent_id_idx" ON "cloud"."conversations" ("assigned_agent_id");--> statement-breakpoint
CREATE INDEX "conversations_tenant_id_updated_at_idx" ON "cloud"."conversations" ("tenant_id","updated_at");--> statement-breakpoint
CREATE INDEX "inboxes_tenant_id_channel_type_idx" ON "cloud"."inboxes" ("tenant_id","channel_type");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_created_at_idx" ON "cloud"."messages" ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "cloud"."messages" ("conversation_id");--> statement-breakpoint
ALTER TABLE "cloud"."canned_responses" ADD CONSTRAINT "canned_responses_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "cloud"."tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."contact_inboxes" ADD CONSTRAINT "contact_inboxes_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "cloud"."contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."contact_inboxes" ADD CONSTRAINT "contact_inboxes_inbox_id_inboxes_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "cloud"."inboxes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "cloud"."tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "cloud"."tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."conversations" ADD CONSTRAINT "conversations_inbox_id_inboxes_id_fkey" FOREIGN KEY ("inbox_id") REFERENCES "cloud"."inboxes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "cloud"."contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."conversations" ADD CONSTRAINT "conversations_contact_inbox_id_contact_inboxes_id_fkey" FOREIGN KEY ("contact_inbox_id") REFERENCES "cloud"."contact_inboxes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."conversations" ADD CONSTRAINT "conversations_assigned_agent_id_users_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "cloud"."users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "cloud"."inboxes" ADD CONSTRAINT "inboxes_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "cloud"."tenants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cloud"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "cloud"."conversations"("id") ON DELETE CASCADE;