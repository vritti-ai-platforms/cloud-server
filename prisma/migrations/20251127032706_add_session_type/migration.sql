-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('ONBOARDING', 'CLOUD');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "type" "SessionType" NOT NULL DEFAULT 'CLOUD',
ALTER COLUMN "refresh_token" DROP NOT NULL,
ALTER COLUMN "refresh_token_expires_at" DROP NOT NULL;
