import type { AnytypeRepository } from "../../adapters/anytype/anytypeRepository.js";
import type { ResolvedIntentResult } from "../intent/types.js";

export interface ExecutionResult {
  status: "completed" | "failed";
  message: string;
}

export class CommandExecutor {
  private readonly anytypeRepository: AnytypeRepository;

  public constructor(anytypeRepository: AnytypeRepository) {
    this.anytypeRepository = anytypeRepository;
  }

  public async execute(intentResult: ResolvedIntentResult): Promise<ExecutionResult> {
    switch (intentResult.intent) {
      case "create_day_plan": {
        const rows: string[] = [];

        for (const plan of intentResult.payload.plans) {
          const saved = await this.anytypeRepository.upsertDayPlan(
            plan.dateIso,
            plan.items,
            plan.sourceSegment,
          );
          rows.push(`- ${saved.title}: ${saved.mergedItems.length} пункт(ов)`);
        }

        return {
          status: "completed",
          message: `План сохранен.\n${rows.join("\n")}`,
        };
      }

      case "add_inbox_note": {
        const saved = await this.anytypeRepository.addInboxNote(intentResult.payload.note);
        return {
          status: "completed",
          message: `Записал в Inbox: ${saved.title}`,
        };
      }

      case "get_day_plan": {
        const plan = await this.anytypeRepository.getDayPlan(intentResult.payload.dateIso);
        if (!plan) {
          return {
            status: "completed",
            message: `План на ${intentResult.payload.dateIso} не найден.`,
          };
        }

        const items =
          plan.items.length > 0
            ? plan.items.map((item, index) => `${index + 1}. ${item}`).join("\n")
            : "Пунктов пока нет.";

        return {
          status: "completed",
          message: `План на ${intentResult.payload.dateIso}:\n${items}`,
        };
      }

      case "get_inbox": {
        const items = await this.anytypeRepository.listInbox(intentResult.payload.limit);
        if (items.length === 0) {
          return {
            status: "completed",
            message: "Inbox сейчас пуст.",
          };
        }

        const text = items.map((item, index) => `${index + 1}. ${item.title}`).join("\n");
        return {
          status: "completed",
          message: `Последние записи в Inbox:\n${text}`,
        };
      }

      default:
        return {
          status: "completed",
          message: "Не увидел четкой инструкции, записал бы в Inbox.",
        };
    }
  }
}
