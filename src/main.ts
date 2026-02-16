import Fastify from "fastify";
import { AnytypeRepository } from "./adapters/anytype/anytypeRepository.js";
import { prisma } from "./adapters/db/prisma.js";
import { McpClient } from "./adapters/mcp/mcpClient.js";
import { OpenRouterClient } from "./adapters/openrouter/openrouterClient.js";
import {
  createCommandQueue,
  createCommandQueueEvents,
  createCommandWorker,
} from "./adapters/queue/commandQueue.js";
import { TelegramBotRuntime } from "./bot/bot.js";
import { handleIncomingMessage } from "./bot/handlers/messageHandler.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { CommandExecutor } from "./core/execution/commandExecutor.js";
import { OperationService } from "./core/execution/operationService.js";
import { IntentRouter } from "./core/intent/intentRouter.js";
import { processCommandJob } from "./workers/commandWorker.js";

const bootstrap = async (): Promise<void> => {
  const mcpClient = new McpClient();
  const anytypeRepository = new AnytypeRepository(mcpClient);
  const openRouterClient = new OpenRouterClient();
  const intentRouter = new IntentRouter(openRouterClient);
  const commandExecutor = new CommandExecutor(anytypeRepository);
  const operationService = new OperationService();

  const queue = createCommandQueue();
  const queueEvents = createCommandQueueEvents();

  const botRuntime = new TelegramBotRuntime({
    onTextMessage: async (ctx) => {
      await handleIncomingMessage(ctx, {
        operationService,
        commandQueue: queue,
      });
    },
  });

  const worker = createCommandWorker(async (jobData) =>
    processCommandJob(jobData, {
      intentRouter,
      commandExecutor,
      operationService,
      sendMessage: (chatId, text) => botRuntime.sendMessage(chatId, text),
    }),
  );

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error }, "Worker job failed.");
  });

  queueEvents.on("completed", ({ jobId }) => {
    logger.info({ jobId }, "Job completed.");
  });

  const app = Fastify({
    logger: false,
  });

  app.get("/health", async () => ({
    status: "ok",
    uptimeSec: process.uptime(),
  }));

  app.get("/ready", async (_, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await queue.getJobCounts();
      return {
        status: "ready",
      };
    } catch (error) {
      logger.error({ error }, "Readiness probe failed.");
      reply.status(503);
      return {
        status: "not-ready",
      };
    }
  });

  if (env.TELEGRAM_USE_WEBHOOK) {
    const path = botRuntime.getWebhookPath();
    const webhookHandler = botRuntime.getWebhookHandler() as (
      request: unknown,
      reply: unknown,
    ) => Promise<void>;
    app.post(path, async (request, reply) => webhookHandler(request, reply));
    await botRuntime.registerWebhook();
    logger.info({ path }, "Webhook endpoint подключен.");
  } else {
    await botRuntime.startPolling();
  }

  await app.listen({
    host: "0.0.0.0",
    port: env.PORT,
  });

  logger.info({ port: env.PORT }, "Service started.");

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down...");
    await worker.close();
    await queue.close();
    await queueEvents.close();
    await botRuntime.stop();
    await app.close();
    await mcpClient.close();
    await prisma.$disconnect();
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

bootstrap().catch((error) => {
  logger.error({ error }, "Fatal bootstrap error.");
  process.exit(1);
});
