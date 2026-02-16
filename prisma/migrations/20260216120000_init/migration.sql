-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "IntentType" AS ENUM ('create_day_plan', 'add_inbox_note', 'get_day_plan', 'get_inbox', 'unknown');

-- CreateTable
CREATE TABLE "ProcessedUpdate" (
    "updateId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedUpdate_pkey" PRIMARY KEY ("updateId")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "telegramUpdateId" BIGINT,
    "chatId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "intent" "IntentType" NOT NULL,
    "requestText" TEXT NOT NULL,
    "normalizedPayload" JSONB,
    "status" "OperationStatus" NOT NULL DEFAULT 'queued',
    "responseText" TEXT,
    "errorText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Operation_status_createdAt_idx" ON "Operation"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Operation_chatId_createdAt_idx" ON "Operation"("chatId", "createdAt");

