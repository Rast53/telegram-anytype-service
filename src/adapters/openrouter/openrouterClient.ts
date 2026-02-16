import { z } from "zod";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import type { IntentName } from "../../core/intent/types.js";
import { withRetry } from "../../lib/retry.js";

const classifierSchema = z.object({
  intent: z.enum(["create_day_plan", "add_inbox_note", "get_day_plan", "get_inbox", "unknown"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

export type ClassifiedIntent = z.infer<typeof classifierSchema>;

const SYSTEM_PROMPT = `Ты классификатор намерений для Telegram сервиса.
Верни только JSON без markdown.
Варианты intent:
- create_day_plan: пользователь задаёт планы на конкретную дату или сегодня.
- add_inbox_note: пользователь просит записать заметку, мысль, напоминание или текст без четкой команды.
- get_day_plan: пользователь запрашивает планы на дату.
- get_inbox: пользователь спрашивает содержимое inbox.
- unknown: не удалось безопасно классифицировать.

Ответ строго в формате:
{"intent":"...","confidence":0.0,"reason":"кратко"}
`;

export class OpenRouterClient {
  public async classifyIntent(text: string): Promise<ClassifiedIntent | null> {
    if (!env.LLM_CLASSIFIER_ENABLED) {
      return null;
    }

    if (!env.OPENROUTER_API_KEY) {
      logger.warn(
        "LLM_CLASSIFIER_ENABLED=true, но OPENROUTER_API_KEY не задан. Классификация выключена.",
      );
      return null;
    }

    const response = await withRetry(
      async () =>
        fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: env.OPENROUTER_MODEL,
            temperature: 0,
            messages: [
              {
                role: "system",
                content: SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: text,
              },
            ],
          }),
        }),
      {
        maxAttempts: 3,
        initialDelayMs: 400,
        maxDelayMs: 3_000,
        factor: 2,
      },
    );

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${raw}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    try {
      const normalized = content
        .replace(/^```json\s*/i, "")
        .replace(/```$/, "")
        .trim();
      return classifierSchema.parse(JSON.parse(normalized));
    } catch (error) {
      logger.warn({ error }, "OpenRouter вернул невалидный JSON классификации.");
      return null;
    }
  }
}
