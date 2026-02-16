import { describe, expect, it } from "vitest";
import type { AnytypeRepository } from "../src/adapters/anytype/anytypeRepository.js";
import { CommandExecutor } from "../src/core/execution/commandExecutor.js";

const buildRepo = (): AnytypeRepository => {
  return {
    addInboxNote: async (note: string) => ({
      objectId: "obj-1",
      title: `Inbox ${note}`,
    }),
    listInbox: async () => [
      { id: "1", title: "Inbox 1", snippet: "first" },
      { id: "2", title: "Inbox 2", snippet: "second" },
    ],
    upsertDayPlan: async () => ({
      objectId: "plan-1",
      title: "План 2026-02-23",
      mergedItems: ["пункт"],
    }),
    getDayPlan: async () => ({
      objectId: "plan-1",
      title: "План 2026-02-23",
      markdown: "",
      items: ["помыть машину", "съездить в сервис"],
    }),
  } as unknown as AnytypeRepository;
};

describe("commandExecutor", () => {
  it("returns formatted day plan", async () => {
    const executor = new CommandExecutor(buildRepo());
    const response = await executor.execute({
      intent: "get_day_plan",
      payload: { dateIso: "2026-02-23" },
      reason: "test",
      confidence: 1,
    });

    expect(response.status).toBe("completed");
    expect(response.message).toContain("План на 2026-02-23");
  });
});
