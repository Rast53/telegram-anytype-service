import { type IntentType, type Operation, Prisma } from "@prisma/client";
import { prisma } from "../../adapters/db/prisma.js";
import type { ResolvedIntentResult } from "../intent/types.js";

const toBigInt = (value: number): bigint => BigInt(value);

export class OperationService {
  public async registerUpdate(updateId: number): Promise<boolean> {
    try {
      await prisma.processedUpdate.create({
        data: {
          updateId: toBigInt(updateId),
        },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return false;
      }
      throw error;
    }
  }

  public async createQueuedOperation(params: {
    telegramUpdateId: number;
    chatId: number;
    userId: number;
    text: string;
  }): Promise<Operation> {
    return prisma.operation.create({
      data: {
        telegramUpdateId: toBigInt(params.telegramUpdateId),
        chatId: toBigInt(params.chatId),
        userId: toBigInt(params.userId),
        intent: "unknown",
        requestText: params.text,
        status: "queued",
      },
    });
  }

  public async markProcessing(operationId: string, intent: ResolvedIntentResult): Promise<void> {
    await prisma.operation.update({
      where: { id: operationId },
      data: {
        status: "processing",
        intent: mapIntent(intent.intent),
        normalizedPayload: intent.payload as Prisma.JsonObject,
      },
    });
  }

  public async markCompleted(operationId: string, responseText: string): Promise<void> {
    await prisma.operation.update({
      where: { id: operationId },
      data: {
        status: "completed",
        responseText,
        completedAt: new Date(),
      },
    });
  }

  public async markFailed(operationId: string, errorText: string): Promise<void> {
    await prisma.operation.update({
      where: { id: operationId },
      data: {
        status: "failed",
        errorText,
        completedAt: new Date(),
      },
    });
  }
}

const mapIntent = (intent: ResolvedIntentResult["intent"]): IntentType => {
  if (
    intent === "create_day_plan" ||
    intent === "add_inbox_note" ||
    intent === "get_day_plan" ||
    intent === "get_inbox"
  ) {
    return intent;
  }
  return "unknown";
};
