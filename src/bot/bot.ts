import { type RunnerHandle, run, sequentialize } from "@grammyjs/runner";
import { Bot, type Context, webhookCallback } from "grammy";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export interface BotRuntimeDeps {
  onTextMessage: (ctx: Context) => Promise<void>;
}

export class TelegramBotRuntime {
  private readonly bot: Bot<Context>;
  private readonly deps: BotRuntimeDeps;
  private runner: RunnerHandle | null = null;

  public constructor(deps: BotRuntimeDeps) {
    this.deps = deps;
    this.bot = new Bot(env.BOT_TOKEN);

    this.bot.use(
      sequentialize((ctx) => {
        return `${ctx.chat?.id ?? "no-chat"}`;
      }),
    );

    this.bot.command("start", async (ctx) => {
      await ctx.reply("Сервис Telegram x Anytype запущен. Пишите задачи и запросы.");
    });

    this.bot.command("help", async (ctx) => {
      await ctx.reply(
        [
          "Примеры:",
          "- Планы на сегодня: помыть машину, съездить в сервис",
          "- План на 23.02.2026: провести встречу с коллегами",
          "- Запиши, что нужно подумать про подарок жене",
          "- Какие есть планы на 23.02.2026",
          "- Что есть в inbox",
        ].join("\n"),
      );
    });

    this.bot.on("message:text", async (ctx) => {
      await this.deps.onTextMessage(ctx);
    });

    this.bot.catch((error) => {
      logger.error({ error }, "Ошибка в Telegram middleware.");
    });
  }

  public async startPolling(): Promise<void> {
    this.runner = run(this.bot);
    logger.info("Telegram bot запущен в polling режиме.");
  }

  public getWebhookPath(): string {
    const rawPath = env.TELEGRAM_WEBHOOK_PATH?.trim();
    if (!rawPath) {
      return `/${env.BOT_TOKEN}`;
    }
    return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  }

  public getWebhookHandler() {
    return webhookCallback(this.bot, "fastify", {
      secretToken: env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
    });
  }

  public async registerWebhook(): Promise<void> {
    const domain = env.TELEGRAM_WEBHOOK_DOMAIN;
    if (!domain) {
      throw new Error("TELEGRAM_WEBHOOK_DOMAIN обязателен в webhook режиме");
    }
    const url = `${domain}${this.getWebhookPath()}`;
    await this.bot.api.setWebhook(url, {
      secret_token: env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
    });
    logger.info({ url }, "Telegram webhook зарегистрирован.");
  }

  public async sendMessage(chatId: number, text: string): Promise<void> {
    await this.bot.api.sendMessage(chatId, text);
  }

  public async stop(): Promise<void> {
    if (this.runner?.isRunning()) {
      await this.runner.stop();
      this.runner = null;
      return;
    }
    this.bot.stop();
  }
}
