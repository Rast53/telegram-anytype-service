import type { OpenRouterClient } from "../../adapters/openrouter/openrouterClient.js";
import { env } from "../../config/env.js";
import { extractDateQuery, parseDayPlansFromText } from "../plans/dayPlanParser.js";
import { fallbackInboxNote } from "../rules/fallbackToInbox.js";
import type { IntentResult, ResolvedIntentResult } from "./types.js";

const inboxQueryRegex =
  /(?:что\s+есть\s+в\s+inbox|что\s+в\s+inbox|что\s+в\s+инбокс|покажи\s+инбокс)/i;
const dayPlanQueryRegex = /(?:какие?\s+(?:есть\s+)?планы?\s+на\s+)/i;
const explicitNoteRegex = /^(запиши|заметка)\b/i;

export class IntentRouter {
  private readonly openRouterClient: OpenRouterClient;

  public constructor(openRouterClient: OpenRouterClient) {
    this.openRouterClient = openRouterClient;
  }

  public async resolve(text: string): Promise<ResolvedIntentResult> {
    const normalized = text.trim();
    const byRule = this.resolveByRules(normalized);
    if (byRule) {
      return byRule;
    }

    const byLlm = await this.resolveByLlm(normalized);
    if (byLlm) {
      return byLlm;
    }

    return {
      intent: "add_inbox_note",
      payload: { note: fallbackInboxNote(normalized) || normalized },
      reason: "fallback: нет четкой инструкции",
      confidence: 0.6,
    };
  }

  private resolveByRules(text: string): ResolvedIntentResult | null {
    if (inboxQueryRegex.test(text)) {
      return {
        intent: "get_inbox",
        payload: { limit: 10 },
        reason: "rule: запрос inbox",
        confidence: 0.99,
      };
    }

    if (dayPlanQueryRegex.test(text)) {
      const dateIso = extractDateQuery(text);
      if (dateIso) {
        return {
          intent: "get_day_plan",
          payload: { dateIso },
          reason: "rule: запрос плана на дату",
          confidence: 0.99,
        };
      }
    }

    const plans = parseDayPlansFromText(text);
    if (plans.length > 0) {
      return {
        intent: "create_day_plan",
        payload: { plans },
        reason: "rule: распознан блок планов",
        confidence: 0.99,
      };
    }

    if (explicitNoteRegex.test(text)) {
      return {
        intent: "add_inbox_note",
        payload: { note: fallbackInboxNote(text) || text },
        reason: "rule: явная команда заметки",
        confidence: 0.95,
      };
    }

    return null;
  }

  private async resolveByLlm(text: string): Promise<ResolvedIntentResult | null> {
    const classified = await this.openRouterClient.classifyIntent(text);
    if (!classified) {
      return null;
    }

    if (classified.confidence < env.LLM_CLASSIFIER_MIN_CONFIDENCE) {
      return null;
    }

    switch (classified.intent) {
      case "create_day_plan": {
        const plans = parseDayPlansFromText(text);
        if (plans.length === 0) {
          return null;
        }
        return {
          intent: "create_day_plan",
          payload: { plans },
          reason: `llm: ${classified.reason}`,
          confidence: classified.confidence,
        };
      }
      case "get_day_plan": {
        const dateIso = extractDateQuery(text);
        if (!dateIso) {
          return null;
        }
        return {
          intent: "get_day_plan",
          payload: { dateIso },
          reason: `llm: ${classified.reason}`,
          confidence: classified.confidence,
        };
      }
      case "get_inbox":
        return {
          intent: "get_inbox",
          payload: { limit: 10 },
          reason: `llm: ${classified.reason}`,
          confidence: classified.confidence,
        };
      case "add_inbox_note":
        return {
          intent: "add_inbox_note",
          payload: { note: fallbackInboxNote(text) || text },
          reason: `llm: ${classified.reason}`,
          confidence: classified.confidence,
        };
      default:
        return null;
    }
  }
}
