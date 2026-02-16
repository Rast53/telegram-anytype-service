import { describe, expect, it } from "vitest";
import type { OpenRouterClient } from "../src/adapters/openrouter/openrouterClient.js";
import { IntentRouter } from "../src/core/intent/intentRouter.js";

const mockOpenRouter = {
  classifyIntent: async () => null,
} as unknown as OpenRouterClient;

describe("intentRouter", () => {
  const router = new IntentRouter(mockOpenRouter);

  it("routes inbox query", async () => {
    const result = await router.resolve("Что есть в inbox?");
    expect(result.intent).toBe("get_inbox");
  });

  it("routes plan creation", async () => {
    const result = await router.resolve("План на 23.02.2026: провести встречу, отправить письмо");
    expect(result.intent).toBe("create_day_plan");
    if (result.intent === "create_day_plan") {
      expect(result.payload.plans[0].dateIso).toBe("2026-02-23");
      expect(result.payload.plans[0].items).toEqual(["провести встречу", "отправить письмо"]);
    }
  });

  it("falls back to inbox note", async () => {
    const result = await router.resolve("надо не забыть про подарок");
    expect(result.intent).toBe("add_inbox_note");
  });
});
