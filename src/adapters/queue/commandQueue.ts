import { type JobsOptions, Queue, QueueEvents, Worker } from "bullmq";
import { env } from "../../config/env.js";

export interface CommandJobData {
  operationId: string;
  chatId: number;
  userId: number;
  text: string;
}

export const createCommandQueue = () => {
  return new Queue<CommandJobData>(env.QUEUE_NAME, {
    connection: buildConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: 500,
      removeOnFail: 500,
    } satisfies JobsOptions,
  });
};

export const createCommandQueueEvents = () => {
  return new QueueEvents(env.QUEUE_NAME, {
    connection: buildConnectionOptions(),
  });
};

export const createCommandWorker = (
  processor: (data: CommandJobData) => Promise<void>,
): Worker<CommandJobData> => {
  return new Worker<CommandJobData>(
    env.QUEUE_NAME,
    async (job) => {
      await processor(job.data);
    },
    {
      connection: buildConnectionOptions(),
      concurrency: 1,
    },
  );
};

const buildConnectionOptions = () => {
  const url = new URL(env.REDIS_URL);
  const db = url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0;
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isNaN(db) ? 0 : db,
    maxRetriesPerRequest: null,
  };
};
