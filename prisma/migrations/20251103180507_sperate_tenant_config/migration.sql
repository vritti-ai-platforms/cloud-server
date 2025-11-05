/*
  Warnings:

  - You are about to drop the column `connection_pool_size` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `db_host` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `db_name` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `db_password` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `db_port` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `db_schema` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `db_ssl_mode` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `db_username` on the `tenants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "connection_pool_size",
DROP COLUMN "db_host",
DROP COLUMN "db_name",
DROP COLUMN "db_password",
DROP COLUMN "db_port",
DROP COLUMN "db_schema",
DROP COLUMN "db_ssl_mode",
DROP COLUMN "db_username";

-- CreateTable
CREATE TABLE "tenant_database_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "db_host" TEXT NOT NULL,
    "db_port" INTEGER NOT NULL,
    "db_username" TEXT NOT NULL,
    "db_password" TEXT NOT NULL,
    "db_name" TEXT NOT NULL,
    "db_schema" TEXT,
    "db_ssl_mode" TEXT NOT NULL DEFAULT 'require',
    "connection_pool_size" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_database_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_database_configs_tenant_id_key" ON "tenant_database_configs"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_database_configs" ADD CONSTRAINT "tenant_database_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
