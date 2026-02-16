import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "authorization",
      "apiKey",
      "token",
      "openrouterApiKey",
      "body",
      "headers",
    ],
    remove: false,
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: false,
          },
        }
      : undefined,
});
