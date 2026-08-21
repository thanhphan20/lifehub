-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "inbox" (
    "id" TEXT NOT NULL,
    "msgId" VARCHAR(255) NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "InboxStatus" NOT NULL DEFAULT 'PROCESSING',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbox_msgId_key" ON "inbox"("msgId");

-- CreateIndex
CREATE INDEX "inbox_status_createdAt_idx" ON "inbox"("status", "createdAt");
