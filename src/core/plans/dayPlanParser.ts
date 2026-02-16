import type { DayPlanEntry } from "../intent/types.js";

const HEADER_REGEX = /планы?\s+на\s+(сегодня|\d{1,2}\.\d{1,2}\.\d{4})\s*:/gi;
const DATE_QUERY_REGEX = /на\s+(сегодня|\d{1,2}\.\d{1,2}\.\d{4})\b/i;

const toIsoDate = (value: string, now: Date): string | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "сегодня") {
    return now.toISOString().slice(0, 10);
  }

  const parts = normalized.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (
    Number.isNaN(day) ||
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const parseItems = (raw: string): string[] => {
  return raw
    .split(/[\n,;]+/g)
    .flatMap((part) => part.split(/[.!?](?:\s+|$)/g))
    .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((item) => item.length > 0);
};

export const parseDayPlansFromText = (text: string, now = new Date()): DayPlanEntry[] => {
  const headers = Array.from(text.matchAll(HEADER_REGEX));
  if (headers.length === 0) {
    return [];
  }

  const results: DayPlanEntry[] = [];

  for (const [index, match] of headers.entries()) {
    const headerText = match[0];
    const dateToken = match[1];
    if (!dateToken) {
      continue;
    }
    const startIndex = match.index ?? 0;
    const contentStart = startIndex + headerText.length;
    const contentEnd = headers[index + 1]?.index ?? text.length;
    const segment = text.slice(contentStart, contentEnd).trim();
    const items = parseItems(segment);
    const dateIso = toIsoDate(dateToken, now);

    if (!dateIso || items.length === 0) {
      continue;
    }

    results.push({
      dateIso,
      items,
      sourceSegment: `${headerText} ${segment}`.trim(),
    });
  }

  return results;
};

export const extractDateQuery = (text: string, now = new Date()): string | null => {
  const match = text.match(DATE_QUERY_REGEX);
  if (!match) {
    return null;
  }

  const dateToken = match[1];
  if (!dateToken) {
    return null;
  }

  return toIsoDate(dateToken, now);
};
