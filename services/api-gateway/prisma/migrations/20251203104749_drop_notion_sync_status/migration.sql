/*
  Warnings:

  - You are about to drop the `notion_sync_status` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "notion_sync_status" DROP CONSTRAINT "notion_sync_status_workoutLogId_fkey";

-- DropTable
DROP TABLE "notion_sync_status";

-- DropEnum
DROP TYPE "SyncStatus";
