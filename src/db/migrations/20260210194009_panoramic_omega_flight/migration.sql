ALTER TYPE "cloud"."SessionType" ADD VALUE 'COMPANY';--> statement-breakpoint
ALTER TABLE "cloud"."sessions" DROP COLUMN "token_type";