import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import type { McpClient } from "../mcp/mcpClient.js";

interface AnytypeListResponse {
  data: Array<{
    id: string;
    name: string;
    snippet?: string;
  }>;
}

interface AnytypeObjectResponse {
  object: {
    id: string;
    name: string;
    markdown?: string;
  };
}

interface AnytypeCreateResponse {
  object: {
    id: string;
    name: string;
  };
}

interface CatalogTargets {
  inboxPageId?: string;
}

export interface InboxItem {
  id: string;
  title: string;
  snippet: string;
}

export interface DayPlanData {
  objectId: string;
  title: string;
  markdown: string;
  items: string[];
}

const inboxTitlePrefix = `${env.ANYTYPE_INBOX_NOTE_TITLE_PREFIX} `;

export class AnytypeRepository {
  private readonly mcpClient: McpClient;
  private catalogLoaded = false;
  private catalogTargets: CatalogTargets = {};

  public constructor(mcpClient: McpClient) {
    this.mcpClient = mcpClient;
  }

  public async addInboxNote(note: string): Promise<{ objectId: string; title: string }> {
    await this.ensureCatalogLoaded();

    const now = new Date();
    const title = `${inboxTitlePrefix}${formatDateTime(now)}`;
    const markdown = [
      `# ${title}`,
      "",
      "## Текст",
      note,
      "",
      "## Мета",
      `- created_at: ${now.toISOString()}`,
      "- source: telegram",
    ].join("\n");

    const created = await this.mcpClient.callTool<AnytypeCreateResponse>("create-object", {
      space_id: env.ANYTYPE_SPACE_ID,
      type_key: "page",
      name: title,
      body: markdown,
    });

    return {
      objectId: created.object.id,
      title,
    };
  }

  public async listInbox(limit = 10): Promise<InboxItem[]> {
    await this.ensureCatalogLoaded();

    const response = await this.mcpClient.callTool<AnytypeListResponse>("search-space", {
      space_id: env.ANYTYPE_SPACE_ID,
      query: env.ANYTYPE_INBOX_NOTE_TITLE_PREFIX,
      types: ["page"],
      limit: Math.max(limit, env.ANYTYPE_SEARCH_LIMIT),
    });

    return response.data
      .filter((item) => item.name.startsWith(inboxTitlePrefix))
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        title: item.name,
        snippet: item.snippet ?? "",
      }));
  }

  public async upsertDayPlan(
    dateIso: string,
    items: string[],
    sourceSegment: string,
  ): Promise<{ objectId: string; title: string; mergedItems: string[] }> {
    await this.ensureCatalogLoaded();

    const title = `${env.ANYTYPE_DAY_PLAN_TITLE_PREFIX} ${dateIso}`;
    const existing = await this.findPageByTitle(title);
    const mergedItems = await this.mergeItems(existing?.markdown, items);
    const markdown = buildDayPlanMarkdown(dateIso, mergedItems, sourceSegment);

    if (!existing) {
      const created = await this.mcpClient.callTool<AnytypeCreateResponse>("create-object", {
        space_id: env.ANYTYPE_SPACE_ID,
        type_key: "page",
        name: title,
        body: markdown,
      });
      return {
        objectId: created.object.id,
        title,
        mergedItems,
      };
    }

    await this.mcpClient.callTool<AnytypeObjectResponse>("update-object", {
      space_id: env.ANYTYPE_SPACE_ID,
      object_id: existing.id,
      markdown,
    });

    return {
      objectId: existing.id,
      title,
      mergedItems,
    };
  }

  public async getDayPlan(dateIso: string): Promise<DayPlanData | null> {
    await this.ensureCatalogLoaded();

    const title = `${env.ANYTYPE_DAY_PLAN_TITLE_PREFIX} ${dateIso}`;
    const found = await this.findPageByTitle(title);
    if (!found) {
      return null;
    }

    return {
      objectId: found.id,
      title: found.name,
      markdown: found.markdown ?? "",
      items: extractChecklistItems(found.markdown ?? ""),
    };
  }

  private async ensureCatalogLoaded(): Promise<void> {
    if (this.catalogLoaded) {
      return;
    }
    this.catalogLoaded = true;

    if (!env.ANYTYPE_CATALOG_OBJECT_ID) {
      return;
    }

    try {
      const catalog = await this.mcpClient.callTool<AnytypeObjectResponse>("get-object", {
        space_id: env.ANYTYPE_SPACE_ID,
        object_id: env.ANYTYPE_CATALOG_OBJECT_ID,
        format: "md",
      });

      const markdown = catalog.object.markdown ?? "";
      const inboxMatch = markdown.match(/01 Inbox \(id:\s*([a-z0-9]+)\)/i);
      if (inboxMatch?.[1]) {
        this.catalogTargets.inboxPageId = inboxMatch[1];
      }
    } catch (error) {
      logger.warn({ error }, "Не удалось прочитать Каталог контекста. Продолжаю по fallback.");
    }
  }

  private async findPageByTitle(
    title: string,
  ): Promise<{ id: string; name: string; markdown?: string } | null> {
    const response = await this.mcpClient.callTool<AnytypeListResponse>("search-space", {
      space_id: env.ANYTYPE_SPACE_ID,
      query: title,
      types: ["page"],
      limit: env.ANYTYPE_SEARCH_LIMIT,
    });

    const exact = response.data.find((item) => item.name.toLowerCase() === title.toLowerCase());
    if (!exact) {
      return null;
    }

    const objectResponse = await this.mcpClient.callTool<AnytypeObjectResponse>("get-object", {
      space_id: env.ANYTYPE_SPACE_ID,
      object_id: exact.id,
      format: "md",
    });

    return objectResponse.object;
  }

  private async mergeItems(
    existingMarkdown: string | undefined,
    nextItems: string[],
  ): Promise<string[]> {
    const existing = new Set(
      extractChecklistItems(existingMarkdown ?? "").map((item) => item.toLowerCase()),
    );
    const merged = [...extractChecklistItems(existingMarkdown ?? "")];

    for (const item of nextItems) {
      const normalized = item.trim();
      if (!normalized) {
        continue;
      }
      if (existing.has(normalized.toLowerCase())) {
        continue;
      }
      existing.add(normalized.toLowerCase());
      merged.push(normalized);
    }

    return merged;
  }
}

const buildDayPlanMarkdown = (dateIso: string, items: string[], sourceSegment: string): string => {
  const checklist = items.map((item) => `- [ ] ${item}`).join("\n");
  return [
    `# План ${dateIso}`,
    "",
    "## Пункты",
    checklist.length > 0 ? checklist : "- [ ] (пусто)",
    "",
    "## Источник",
    sourceSegment,
    "",
    "## Обновлено",
    new Date().toISOString(),
  ].join("\n");
};

const extractChecklistItems = (markdown: string): string[] => {
  const items: string[] = [];
  const regex = /^-\s+\[(?:\s|x|X)\]\s+(.+)$/gm;
  let match = regex.exec(markdown);
  while (match) {
    const captured = match[1];
    if (captured) {
      items.push(captured.trim());
    }
    match = regex.exec(markdown);
  }
  return items;
};

const formatDateTime = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
};
