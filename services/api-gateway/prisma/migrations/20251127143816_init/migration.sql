-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notion_sync_status" (
    "id" TEXT NOT NULL,
    "workoutLogId" TEXT NOT NULL,
    "notionPageId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "notion_sync_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_logs_createdAt_idx" ON "workout_logs"("createdAt");

-- CreateIndex
CREATE INDEX "workout_logs_type_idx" ON "workout_logs"("type");

-- CreateIndex
CREATE UNIQUE INDEX "notion_sync_status_workoutLogId_key" ON "notion_sync_status"("workoutLogId");

-- CreateIndex
CREATE INDEX "notion_sync_status_status_idx" ON "notion_sync_status"("status");

-- CreateIndex
CREATE INDEX "notion_sync_status_workoutLogId_idx" ON "notion_sync_status"("workoutLogId");

-- AddForeignKey
ALTER TABLE "notion_sync_status" ADD CONSTRAINT "notion_sync_status_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "workout_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
