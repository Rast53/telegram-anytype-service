import type { CommandJobData } from "../adapters/queue/commandQueue.js";
import { logger } from "../config/logger.js";
import type { CommandExecutor } from "../core/execution/commandExecutor.js";
import type { OperationService } from "../core/execution/operationService.js";
import type { IntentRouter } from "../core/intent/intentRouter.js";

export interface WorkerDeps {
  intentRouter: IntentRouter;
  commandExecutor: CommandExecutor;
  operationService: OperationService;
  sendMessage: (chatId: number, text: string) => Promise<void>;
}

export const processCommandJob = async (data: CommandJobData, deps: WorkerDeps): Promise<void> => {
  const { operationId, chatId, text } = data;

  try {
    const intentResult = await deps.intentRouter.resolve(text);
    await deps.operationService.markProcessing(operationId, intentResult);

    const executionResult = await deps.commandExecutor.execute(intentResult);

    if (executionResult.status === "completed") {
      await deps.operationService.markCompleted(operationId, executionResult.message);
      await deps.sendMessage(chatId, executionResult.message);
      return;
    }

    await deps.operationService.markFailed(operationId, executionResult.message);
    await deps.sendMessage(chatId, `Ошибка обработки: ${executionResult.message}`);
  } catch (error) {
    const safeError = error instanceof Error ? error.message : "Неизвестная ошибка";
    await deps.operationService.markFailed(operationId, safeError);
    await deps.sendMessage(chatId, `Ошибка выполнения задачи: ${safeError}`);
    logger.error({ error, operationId }, "Job завершился с ошибкой.");
  }
};
