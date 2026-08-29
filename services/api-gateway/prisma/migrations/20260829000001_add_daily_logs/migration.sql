-- AlterTable
ALTER TABLE "daily_entries" ADD COLUMN "logs" JSONB NOT NULL DEFAULT '[]';
