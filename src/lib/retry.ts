export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  factor: number;
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  shouldRetry?: (error: unknown) => boolean,
): Promise<T> => {
  let attempt = 0;
  let delay = options.initialDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      const retryable = shouldRetry ? shouldRetry(error) : true;
      if (!retryable || attempt >= options.maxAttempts) {
        throw error;
      }
      await sleep(delay);
      delay = Math.min(Math.round(delay * options.factor), options.maxDelayMs);
    }
  }
};
