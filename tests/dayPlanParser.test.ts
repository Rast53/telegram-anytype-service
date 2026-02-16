import { describe, expect, it } from "vitest";
import { extractDateQuery, parseDayPlansFromText } from "../src/core/plans/dayPlanParser.js";

describe("dayPlanParser", () => {
  it("parses multiple plan segments with dates", () => {
    const now = new Date("2026-02-20T10:00:00.000Z");
    const text =
      "Планы на сегодня: помыть машину, съездить в сервис. " +
      "План на 23.02.2026: провести встречу с коллегами";

    const result = parseDayPlansFromText(text, now);

    expect(result).toHaveLength(2);
    expect(result[0].dateIso).toBe("2026-02-20");
    expect(result[0].items).toEqual(["помыть машину", "съездить в сервис"]);
    expect(result[1].dateIso).toBe("2026-02-23");
    expect(result[1].items).toEqual(["провести встречу с коллегами"]);
  });

  it("extracts date query", () => {
    const date = extractDateQuery("Какие есть планы на 23.02.2026?");
    expect(date).toBe("2026-02-23");
  });
});
