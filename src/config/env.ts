import "dotenv/config";
import { z } from "zod";

const yesValues = new Set(["1", "true", "yes", "on"]);

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) {
      return false;
    }
    return yesValues.has(value.toLowerCase());
  });

const splitCsv = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),

  BOT_TOKEN: z.string().min(10, "BOT_TOKEN обязателен"),
  TELEGRAM_ALLOWED_USER_IDS: z.string().min(1, "TELEGRAM_ALLOWED_USER_IDS обязателен"),
  TELEGRAM_ALLOWED_CHAT_IDS: z.string().optional(),

  TELEGRAM_USE_WEBHOOK: booleanFromString,
  TELEGRAM_WEBHOOK_DOMAIN: z.string().optional(),
  TELEGRAM_WEBHOOK_PATH: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET_TOKEN: z.string().optional(),

  DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен"),
  REDIS_URL: z.string().min(1, "REDIS_URL обязателен"),
  QUEUE_NAME: z.string().default("telegram-anytype-commands"),

  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("http"),
  MCP_HTTP_URL: z.string().optional(),
  MCP_HTTP_HEADERS_JSON: z.string().optional(),
  MCP_STDIO_COMMAND: z.string().optional(),
  MCP_STDIO_ARGS: z.string().optional(),
  MCP_STDIO_ENV_JSON: z.string().optional(),

  ANYTYPE_SPACE_ID: z.string().min(1, "ANYTYPE_SPACE_ID обязателен"),
  ANYTYPE_CATALOG_OBJECT_ID: z.string().optional(),
  ANYTYPE_INBOX_PAGE_TITLE: z.string().default("01 Inbox"),
  ANYTYPE_DAY_PLAN_TITLE_PREFIX: z.string().default("План"),
  ANYTYPE_INBOX_NOTE_TITLE_PREFIX: z.string().default("Inbox"),
  ANYTYPE_SEARCH_LIMIT: z.coerce.number().int().positive().default(20),

  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().default("openai/gpt-4o-mini"),
  LLM_CLASSIFIER_ENABLED: booleanFromString,
  LLM_CLASSIFIER_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.75),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Ошибка ENV конфигурации: ${message}`);
}

const mcpHttpHeaders = (() => {
  const raw = parsed.data.MCP_HTTP_HEADERS_JSON;
  if (!raw) {
    return {};
  }
  try {
    const value = JSON.parse(raw) as Record<string, string>;
    return value;
  } catch (error) {
    throw new Error(`MCP_HTTP_HEADERS_JSON должен быть валидным JSON: ${(error as Error).message}`);
  }
})();

const mcpStdioEnv = (() => {
  const raw = parsed.data.MCP_STDIO_ENV_JSON;
  if (!raw) {
    return {};
  }
  try {
    const value = JSON.parse(raw) as Record<string, string>;
    return value;
  } catch (error) {
    throw new Error(`MCP_STDIO_ENV_JSON должен быть валидным JSON: ${(error as Error).message}`);
  }
})();

export const env = {
  ...parsed.data,
  telegramAllowedUserIds: splitCsv(parsed.data.TELEGRAM_ALLOWED_USER_IDS),
  telegramAllowedChatIds: splitCsv(parsed.data.TELEGRAM_ALLOWED_CHAT_IDS),
  mcpHttpHeaders,
  mcpStdioArgs: splitCsv(parsed.data.MCP_STDIO_ARGS),
  mcpStdioEnv,
};

export type AppEnv = typeof env;
