import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { withRetry } from "../../lib/retry.js";

type McpTransport = StdioClientTransport | StreamableHTTPClientTransport;

export class McpClient {
  private readonly client: Client;
  private transport: McpTransport | null = null;
  private connected = false;
  private availableToolNames: Set<string> | null = null;

  public constructor() {
    this.client = new Client(
      {
        name: "telegram-anytype-service",
        version: "0.1.0",
      },
      {},
    );
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    this.transport = this.buildTransport();
    await this.client.connect(this.transport);
    this.connected = true;
    this.availableToolNames = null;
  }

  public async close(): Promise<void> {
    if (!this.connected || !this.transport) {
      return;
    }

    try {
      if (this.transport instanceof StreamableHTTPClientTransport) {
        await this.transport.terminateSession();
      }
    } catch (error) {
      logger.warn({ error }, "Не удалось корректно завершить MCP сессию.");
    }

    await this.transport.close();
    this.connected = false;
    this.transport = null;
    this.availableToolNames = null;
  }

  public async listTools(): Promise<string[]> {
    const tools = await this.getAvailableToolNames(true);
    return [...tools];
  }

  public async callTool<T = unknown>(toolName: string, args: Record<string, unknown>): Promise<T> {
    await this.connect();

    let availableNames = new Set<string>();
    try {
      availableNames = await this.getAvailableToolNames();
    } catch (error) {
      logger.warn(
        { error },
        "Не удалось заранее получить список MCP tools. Пробую fallback по именам.",
      );
    }

    const candidates = buildToolNameCandidates(toolName).sort(
      (left, right) => Number(availableNames.has(right)) - Number(availableNames.has(left)),
    );

    let lastMethodNotFoundError: string | null = null;
    for (const candidateName of candidates) {
      try {
        const result = await withRetry(
          async () =>
            this.client.callTool({
              name: candidateName,
              arguments: args,
            }),
          {
            maxAttempts: 3,
            initialDelayMs: 500,
            maxDelayMs: 2_500,
            factor: 2,
          },
        );

        return parseToolResponse<T>(result, toolName);
      } catch (error) {
        const safeError = error instanceof Error ? error.message : "Unknown MCP error";

        if (safeError.toLowerCase().includes("not connected")) {
          this.connected = false;
          this.availableToolNames = null;
        }

        if (isMethodNotFoundError(safeError)) {
          lastMethodNotFoundError = safeError;
          continue;
        }

        throw new Error(`MCP callTool(${toolName}) failed: ${safeError}`);
      }
    }

    throw new Error(
      `MCP callTool(${toolName}) failed: ${
        lastMethodNotFoundError ?? "Tool не найден ни по legacy, ни по API-имени."
      }`,
    );
  }

  private buildTransport(): McpTransport {
    if (env.MCP_TRANSPORT === "http") {
      if (!env.MCP_HTTP_URL) {
        throw new Error("MCP_HTTP_URL обязателен при MCP_TRANSPORT=http");
      }
      return new StreamableHTTPClientTransport(new URL(env.MCP_HTTP_URL), {
        requestInit: {
          headers: env.mcpHttpHeaders,
        },
      });
    }

    if (!env.MCP_STDIO_COMMAND) {
      throw new Error("MCP_STDIO_COMMAND обязателен при MCP_TRANSPORT=stdio");
    }

    return new StdioClientTransport({
      command: env.MCP_STDIO_COMMAND,
      args: env.mcpStdioArgs,
      env: normalizeEnv({ ...process.env, ...env.mcpStdioEnv }),
    });
  }

  private async getAvailableToolNames(forceRefresh = false): Promise<Set<string>> {
    await this.connect();

    if (!forceRefresh && this.availableToolNames) {
      return this.availableToolNames;
    }

    const response = await this.client.listTools();
    this.availableToolNames = new Set(response.tools.map((tool) => tool.name));
    return this.availableToolNames;
  }
}

const parseToolResponse = <T>(rawResult: unknown, requestedToolName: string): T => {
  const typedResult = rawResult as {
    structuredContent?: unknown;
    content?: Array<{ type: string; text?: string }>;
  };

  if (typedResult.structuredContent) {
    return typedResult.structuredContent as T;
  }

  const textPart = typedResult.content?.find((entry) => entry.type === "text");
  if (!textPart?.text) {
    throw new Error(`Tool ${requestedToolName} вернул пустой ответ.`);
  }

  return parseJsonSafe<T>(textPart.text);
};

const parseJsonSafe = <T>(raw: string): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return { raw } as T;
  }
};

const buildToolNameCandidates = (toolName: string): string[] => {
  const normalized = toolName.trim();
  if (!normalized) {
    return [toolName];
  }

  const variants = [normalized];
  if (normalized.startsWith("API-")) {
    variants.push(normalized.slice(4));
  } else {
    variants.push(`API-${normalized}`);
  }

  return [...new Set(variants.filter(Boolean))];
};

const isMethodNotFoundError = (errorMessage: string): boolean =>
  /method\s+.+\s+not\s+found/i.test(errorMessage);

const normalizeEnv = (source: Record<string, string | undefined>): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};
