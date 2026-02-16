import type { Context } from "grammy";
import type { CommandJobData } from "../../adapters/queue/commandQueue.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import type { OperationService } from "../../core/execution/operationService.js";

interface CommandQueueLike {
  add: (name: string, data: CommandJobData) => Promise<unknown>;
}

export interface MessageHandlerDeps {
  operationService: OperationService;
  commandQueue: CommandQueueLike;
}

const isAllowedUser = (userId: number): boolean => {
  return env.telegramAllowedUserIds.includes(String(userId));
};

const isAllowedChat = (chatId: number): boolean => {
  if (env.telegramAllowedChatIds.length === 0) {
    return true;
  }
  return env.telegramAllowedChatIds.includes(String(chatId));
};

export const handleIncomingMessage = async (
  ctx: Context,
  deps: MessageHandlerDeps,
): Promise<void> => {
  const text = ctx.message?.text?.trim();
  const fromId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const updateId = ctx.update.update_id;

  if (!text || fromId === undefined || chatId === undefined) {
    return;
  }

  const isNewUpdate = await deps.operationService.registerUpdate(updateId);
  if (!isNewUpdate) {
    logger.info({ updateId }, "Дубликат update, пропускаю.");
    return;
  }

  if (!isAllowedUser(fromId) || !isAllowedChat(chatId)) {
    await ctx.reply("Доступ к сервису ограничен. Обратитесь к владельцу.");
    return;
  }

  const operation = await deps.operationService.createQueuedOperation({
    telegramUpdateId: updateId,
    chatId,
    userId: fromId,
    text,
  });

  await deps.commandQueue.add("process-command", {
    operationId: operation.id,
    chatId,
    userId: fromId,
    text,
  });

  await ctx.reply(`Принято. task_id=${operation.id}`);
};
