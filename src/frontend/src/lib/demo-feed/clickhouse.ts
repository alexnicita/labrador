import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { randomUUID } from "node:crypto";

import { DEMO_ROOM_ID } from "@/lib/demo-feed/types";

const DEFAULT_DATABASE = "labrador_demo";
const DEFAULT_USAGE_TABLE = "labrador_demo_usage_events";
const DEFAULT_METADATA_LIMIT = 4000;

type ClickHouseConfig = {
  url: string;
  username: string;
  password: string;
  database: string;
  table: string;
};

export type DemoUsageEvent = {
  roomId?: string;
  actorId?: string;
  runId?: string | null;
  action: string;
  provider: string;
  status: "success" | "failed" | "skipped";
  latencyMs?: number;
  inputChars?: number;
  outputChars?: number;
  resultCount?: number;
  vendorRequestId?: string | null;
  errorCode?: string | null;
  metadata?: Record<string, unknown>;
};

export type DemoUsageAggregate = {
  action: string;
  provider: string;
  status: string;
  count: number;
  lastOccurredAt: string | null;
};

type UsageAggregateRow = {
  action: string;
  provider: string;
  status: string;
  count: string | number;
  lastOccurredAt?: string | null;
  last_occurred_at?: string | null;
};

export type DemoUsageAnalyticsTimeRange = "hour" | "day" | "week" | "all";
export type DemoUsageAnalyticsGroupBy =
  | "action"
  | "provider"
  | "status"
  | "actor"
  | "hour";

export type DemoUsageAnalyticsQuery = {
  timeRange?: DemoUsageAnalyticsTimeRange;
  groupBy?: DemoUsageAnalyticsGroupBy[];
  action?: string | null;
  provider?: string | null;
  status?: "success" | "failed" | "skipped" | null;
  limit?: number;
};

export type DemoUsageAnalyticsResult = {
  available: boolean;
  timeRange: DemoUsageAnalyticsTimeRange;
  generatedAt: string;
  filters: {
    roomId: string;
    action: string | null;
    provider: string | null;
    status: string | null;
  };
  totals: {
    events: number;
    successes: number;
    failures: number;
    skipped: number;
    inputChars: number;
    outputChars: number;
    resultCount: number;
    avgLatencyMs: number | null;
    firstOccurredAt: string | null;
    lastOccurredAt: string | null;
  };
  groups: Array<{
    dimensions: Record<string, string>;
    events: number;
    successes: number;
    failures: number;
    skipped: number;
    inputChars: number;
    outputChars: number;
    resultCount: number;
    avgLatencyMs: number | null;
    lastOccurredAt: string | null;
  }>;
  recentFailures: Array<{
    action: string;
    provider: string;
    errorCode: string | null;
    events: number;
    lastOccurredAt: string | null;
  }>;
};

type UsageAnalyticsTotalsRow = {
  events: string | number;
  successes: string | number;
  failures: string | number;
  skipped: string | number;
  inputChars?: string | number | null;
  input_chars?: string | number | null;
  outputChars?: string | number | null;
  output_chars?: string | number | null;
  resultCount?: string | number | null;
  result_count?: string | number | null;
  avgLatencyMs?: string | number | null;
  avg_latency_ms?: string | number | null;
  firstOccurredAt?: string | null;
  first_occurred_at?: string | null;
  lastOccurredAt?: string | null;
  last_occurred_at?: string | null;
};

type UsageAnalyticsGroupRow = UsageAnalyticsTotalsRow & {
  action?: string;
  provider?: string;
  status?: string;
  actorId?: string;
  actor_id?: string;
  hour?: string;
};

type UsageAnalyticsFailureRow = {
  action: string;
  provider: string;
  errorCode?: string | null;
  error_code?: string | null;
  events: string | number;
  lastOccurredAt?: string | null;
  last_occurred_at?: string | null;
};

let client: ClickHouseClient | null | undefined;
let missingConfigWarned = false;
let failureWarned = false;

function getConfig(): ClickHouseConfig | null {
  const url = (
    process.env.CLICKHOUSE_URL ??
    process.env.CLICKHOUSE_HOST ??
    ""
  ).trim();
  const username = (
    process.env.CLICKHOUSE_USER ??
    process.env.CLICKHOUSE_USERNAME ??
    "default"
  ).trim();
  const password = (process.env.CLICKHOUSE_PASSWORD ?? "").trim();
  const database = normalizeIdentifier(
    process.env.CLICKHOUSE_DATABASE,
    DEFAULT_DATABASE,
  );
  const table = normalizeIdentifier(
    process.env.CLICKHOUSE_USAGE_TABLE,
    DEFAULT_USAGE_TABLE,
  );

  if (!url) {
    if (!missingConfigWarned) {
      missingConfigWarned = true;
      console.warn("clickhouse usage tracking disabled", {
        code: "missing_clickhouse_url",
      });
    }
    return null;
  }

  return { url, username, password, database, table };
}

function normalizeIdentifier(value: string | undefined, fallback: string) {
  const identifier = (value ?? fallback).trim();

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    return identifier;
  }

  return fallback;
}

function quoteIdentifier(value: string) {
  return `\`${value}\``;
}

function getUsageTableName(config: ClickHouseConfig) {
  return `${quoteIdentifier(config.database)}.${quoteIdentifier(config.table)}`;
}

function getClient() {
  const config = getConfig();

  if (!config) {
    return null;
  }

  if (!client) {
    client = createClient({
      url: config.url,
      username: config.username,
      password: config.password,
      database: config.database,
      application: "labrador-demo",
      request_timeout: readIntegerEnv("CLICKHOUSE_REQUEST_TIMEOUT_MS", 5000, 1000, 30000),
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 1,
      },
    });
  }

  return { client, config };
}

export async function trackUsageEvent(event: DemoUsageEvent) {
  const connection = getClient();

  if (!connection) {
    return;
  }

  try {
    await connection.client.insert({
      table: getUsageTableName(connection.config),
      values: [
        {
          occurred_at: new Date().toISOString(),
          event_id: randomUUID(),
          room_id: safeToken(event.roomId ?? DEMO_ROOM_ID, DEMO_ROOM_ID),
          actor_id: safeToken(event.actorId ?? "system", "system"),
          run_id: event.runId ?? null,
          action: safeToken(event.action, "unknown"),
          provider: safeToken(event.provider, "app"),
          status: safeToken(event.status, "failed"),
          latency_ms: clampInteger(event.latencyMs, 0, 3_600_000),
          input_chars: clampInteger(event.inputChars, 0, 1_000_000),
          output_chars: clampInteger(event.outputChars, 0, 1_000_000),
          result_count: clampInteger(event.resultCount, 0, 10_000),
          vendor_request_id: event.vendorRequestId
            ? safeText(event.vendorRequestId, 256)
            : null,
          error_code: event.errorCode ? safeToken(event.errorCode, "error") : null,
          metadata_json: serializeMetadata(event.metadata),
        },
      ],
      format: "JSONEachRow",
    });
  } catch (error) {
    warnClickHouseFailure("clickhouse usage write failed", error);
  }
}

export async function getDemoUsageAggregates() {
  const connection = getClient();

  if (!connection) {
    return { available: false, aggregates: [] as DemoUsageAggregate[] };
  }

  try {
    const rows = await connection.client.query({
      query: `
        SELECT
          action,
          provider,
          status,
          count() AS count,
          max(occurred_at) AS lastOccurredAt
        FROM ${getUsageTableName(connection.config)}
        WHERE occurred_at >= now() - INTERVAL 24 HOUR
        GROUP BY action, provider, status
        ORDER BY count DESC, action ASC, provider ASC, status ASC
        LIMIT 100
      `,
      format: "JSONEachRow",
    });
    const payload = (await rows.json()) as UsageAggregateRow[];

    return {
      available: true,
      aggregates: payload.map((row) => ({
        action: row.action,
        provider: row.provider,
        status: row.status,
        count: Number(row.count ?? 0),
        lastOccurredAt: row.lastOccurredAt ?? row.last_occurred_at ?? null,
      })),
    };
  } catch (error) {
    warnClickHouseFailure("clickhouse usage read failed", error);
    return { available: false, aggregates: [] as DemoUsageAggregate[] };
  }
}

export async function queryDemoUsageAnalytics(
  query: DemoUsageAnalyticsQuery = {},
): Promise<DemoUsageAnalyticsResult> {
  const timeRange = normalizeTimeRange(query.timeRange);
  const action = query.action ? safeToken(query.action, "") : null;
  const provider = query.provider ? safeToken(query.provider, "") : null;
  const status = normalizeStatus(query.status);
  const groupBy = normalizeAnalyticsGroupBy(query.groupBy);
  const limit = clampInteger(query.limit ?? 10, 1, 25);
  const emptyResult = createEmptyAnalyticsResult({
    timeRange,
    action,
    provider,
    status,
  });
  const connection = getClient();

  if (!connection) {
    return emptyResult;
  }

  const whereClause = buildAnalyticsWhereClause({
    timeRange,
    action,
    provider,
    status,
  });
  const failureWhereClause = buildAnalyticsWhereClause({
    timeRange,
    action,
    provider,
    status: status === "success" || status === "skipped" ? status : "failed",
  });

  try {
    const [totalsResponse, groupsResponse, failuresResponse] = await Promise.all([
      connection.client.query({
        query: `
          SELECT
            count() AS events,
            countIf(status = 'success') AS successes,
            countIf(status = 'failed') AS failures,
            countIf(status = 'skipped') AS skipped,
            sum(input_chars) AS inputChars,
            sum(output_chars) AS outputChars,
            sum(result_count) AS resultCount,
            avgIf(latency_ms, latency_ms > 0) AS avgLatencyMs,
            min(occurred_at) AS firstOccurredAt,
            max(occurred_at) AS lastOccurredAt
          FROM ${getUsageTableName(connection.config)}
          ${whereClause}
        `,
        format: "JSONEachRow",
      }),
      connection.client.query({
        query: `
          SELECT
            ${buildAnalyticsDimensionSelect(groupBy)},
            count() AS events,
            countIf(status = 'success') AS successes,
            countIf(status = 'failed') AS failures,
            countIf(status = 'skipped') AS skipped,
            sum(input_chars) AS inputChars,
            sum(output_chars) AS outputChars,
            sum(result_count) AS resultCount,
            avgIf(latency_ms, latency_ms > 0) AS avgLatencyMs,
            max(occurred_at) AS lastOccurredAt
          FROM ${getUsageTableName(connection.config)}
          ${whereClause}
          GROUP BY ${buildAnalyticsGroupByClause(groupBy)}
          ORDER BY events DESC, lastOccurredAt DESC
          LIMIT ${limit}
        `,
        format: "JSONEachRow",
      }),
      connection.client.query({
        query: `
          SELECT
            action,
            provider,
            error_code AS errorCode,
            count() AS events,
            max(occurred_at) AS lastOccurredAt
          FROM ${getUsageTableName(connection.config)}
          ${failureWhereClause}
          GROUP BY action, provider, error_code
          ORDER BY events DESC, lastOccurredAt DESC
          LIMIT 10
        `,
        format: "JSONEachRow",
      }),
    ]);
    const totalsRows = (await totalsResponse.json()) as UsageAnalyticsTotalsRow[];
    const groupRows = (await groupsResponse.json()) as UsageAnalyticsGroupRow[];
    const failureRows =
      (await failuresResponse.json()) as UsageAnalyticsFailureRow[];

    return {
      available: true,
      timeRange,
      generatedAt: new Date().toISOString(),
      filters: {
        roomId: DEMO_ROOM_ID,
        action,
        provider,
        status,
      },
      totals: mapAnalyticsTotals(totalsRows[0]),
      groups: groupRows.map((row) => mapAnalyticsGroup(row, groupBy)),
      recentFailures:
        status === "success" || status === "skipped"
          ? []
          : failureRows.map(mapAnalyticsFailure),
    };
  } catch (error) {
    warnClickHouseFailure("clickhouse analytics query failed", error);
    return emptyResult;
  }
}

function createEmptyAnalyticsResult({
  timeRange,
  action,
  provider,
  status,
}: {
  timeRange: DemoUsageAnalyticsTimeRange;
  action: string | null;
  provider: string | null;
  status: DemoUsageAnalyticsQuery["status"] | null;
}): DemoUsageAnalyticsResult {
  return {
    available: false,
    timeRange,
    generatedAt: new Date().toISOString(),
    filters: {
      roomId: DEMO_ROOM_ID,
      action,
      provider,
      status: status ?? null,
    },
    totals: {
      events: 0,
      successes: 0,
      failures: 0,
      skipped: 0,
      inputChars: 0,
      outputChars: 0,
      resultCount: 0,
      avgLatencyMs: null,
      firstOccurredAt: null,
      lastOccurredAt: null,
    },
    groups: [],
    recentFailures: [],
  };
}

function normalizeTimeRange(
  value: DemoUsageAnalyticsQuery["timeRange"],
): DemoUsageAnalyticsTimeRange {
  if (value === "hour" || value === "day" || value === "week" || value === "all") {
    return value;
  }

  return "day";
}

function normalizeStatus(value: DemoUsageAnalyticsQuery["status"]) {
  if (value === "success" || value === "failed" || value === "skipped") {
    return value;
  }

  return null;
}

function normalizeAnalyticsGroupBy(
  value: DemoUsageAnalyticsQuery["groupBy"],
): DemoUsageAnalyticsGroupBy[] {
  const allowed = new Set<DemoUsageAnalyticsGroupBy>([
    "action",
    "provider",
    "status",
    "actor",
    "hour",
  ]);
  const groupBy = (value ?? ["action", "provider", "status"])
    .filter((dimension): dimension is DemoUsageAnalyticsGroupBy =>
      allowed.has(dimension as DemoUsageAnalyticsGroupBy),
    )
    .slice(0, 3);

  return groupBy.length > 0 ? groupBy : ["action", "provider", "status"];
}

function buildAnalyticsWhereClause({
  timeRange,
  action,
  provider,
  status,
}: {
  timeRange: DemoUsageAnalyticsTimeRange;
  action: string | null;
  provider: string | null;
  status: DemoUsageAnalyticsQuery["status"] | null;
}) {
  const filters = [`room_id = ${quoteStringLiteral(DEMO_ROOM_ID)}`];

  if (timeRange === "hour") {
    filters.push("occurred_at >= now() - INTERVAL 1 HOUR");
  } else if (timeRange === "day") {
    filters.push("occurred_at >= now() - INTERVAL 24 HOUR");
  } else if (timeRange === "week") {
    filters.push("occurred_at >= now() - INTERVAL 7 DAY");
  }

  if (action) {
    filters.push(`action = ${quoteStringLiteral(action)}`);
  }

  if (provider) {
    filters.push(`provider = ${quoteStringLiteral(provider)}`);
  }

  if (status) {
    filters.push(`status = ${quoteStringLiteral(status)}`);
  }

  return `WHERE ${filters.join("\n            AND ")}`;
}

function buildAnalyticsDimensionSelect(groupBy: DemoUsageAnalyticsGroupBy[]) {
  return groupBy.map((dimension) => analyticsDimensionSql[dimension].select).join(",\n            ");
}

function buildAnalyticsGroupByClause(groupBy: DemoUsageAnalyticsGroupBy[]) {
  return groupBy.map((dimension) => analyticsDimensionSql[dimension].groupBy).join(", ");
}

const analyticsDimensionSql: Record<
  DemoUsageAnalyticsGroupBy,
  { select: string; groupBy: string; rowKey: keyof UsageAnalyticsGroupRow }
> = {
  action: { select: "action", groupBy: "action", rowKey: "action" },
  provider: { select: "provider", groupBy: "provider", rowKey: "provider" },
  status: { select: "status", groupBy: "status", rowKey: "status" },
  actor: { select: "actor_id AS actorId", groupBy: "actor_id", rowKey: "actorId" },
  hour: {
    select: "toString(toStartOfHour(occurred_at)) AS hour",
    groupBy: "toStartOfHour(occurred_at)",
    rowKey: "hour",
  },
};

function mapAnalyticsTotals(
  row: UsageAnalyticsTotalsRow | undefined,
): DemoUsageAnalyticsResult["totals"] {
  return {
    events: numberFromRow(row?.events),
    successes: numberFromRow(row?.successes),
    failures: numberFromRow(row?.failures),
    skipped: numberFromRow(row?.skipped),
    inputChars: numberFromRow(row?.inputChars ?? row?.input_chars),
    outputChars: numberFromRow(row?.outputChars ?? row?.output_chars),
    resultCount: numberFromRow(row?.resultCount ?? row?.result_count),
    avgLatencyMs: nullableNumberFromRow(row?.avgLatencyMs ?? row?.avg_latency_ms),
    firstOccurredAt: row?.firstOccurredAt ?? row?.first_occurred_at ?? null,
    lastOccurredAt: row?.lastOccurredAt ?? row?.last_occurred_at ?? null,
  };
}

function mapAnalyticsGroup(
  row: UsageAnalyticsGroupRow,
  groupBy: DemoUsageAnalyticsGroupBy[],
): DemoUsageAnalyticsResult["groups"][number] {
  return {
    dimensions: Object.fromEntries(
      groupBy.map((dimension) => {
        const rowKey = analyticsDimensionSql[dimension].rowKey;
        return [dimension, safeText(String(row[rowKey] ?? ""), 160)];
      }),
    ),
    events: numberFromRow(row.events),
    successes: numberFromRow(row.successes),
    failures: numberFromRow(row.failures),
    skipped: numberFromRow(row.skipped),
    inputChars: numberFromRow(row.inputChars ?? row.input_chars),
    outputChars: numberFromRow(row.outputChars ?? row.output_chars),
    resultCount: numberFromRow(row.resultCount ?? row.result_count),
    avgLatencyMs: nullableNumberFromRow(row.avgLatencyMs ?? row.avg_latency_ms),
    lastOccurredAt: row.lastOccurredAt ?? row.last_occurred_at ?? null,
  };
}

function mapAnalyticsFailure(
  row: UsageAnalyticsFailureRow,
): DemoUsageAnalyticsResult["recentFailures"][number] {
  return {
    action: safeText(row.action, 160),
    provider: safeText(row.provider, 160),
    errorCode: row.errorCode ?? row.error_code ?? null,
    events: numberFromRow(row.events),
    lastOccurredAt: row.lastOccurredAt ?? row.last_occurred_at ?? null,
  };
}

function quoteStringLiteral(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function numberFromRow(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function nullableNumberFromRow(value: string | number | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function warnClickHouseFailure(message: string, error: unknown) {
  if (failureWarned) {
    return;
  }

  failureWarned = true;
  console.warn(message, {
    code: safeErrorCode(error),
  });
}

function safeErrorCode(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return safeToken(String((error as { code?: unknown }).code), "unknown_error");
  }

  if (error instanceof Error && error.name) {
    return safeToken(error.name, "unknown_error");
  }

  return "unknown_error";
}

function serializeMetadata(metadata: DemoUsageEvent["metadata"]) {
  if (!metadata) {
    return "{}";
  }

  return safeText(JSON.stringify(redactMetadata(metadata)), DEFAULT_METADATA_LIMIT);
}

function redactMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(redactMetadata);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (/key|secret|token|password|authorization/i.test(key)) {
        return [key, "[redacted]"];
      }

      if (typeof entry === "string") {
        return [key, safeText(entry, 500)];
      }

      return [key, redactMetadata(entry)];
    }),
  );
}

function safeToken(value: string, fallback: string) {
  const token = value.trim().replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 128);
  return token || fallback;
}

function safeText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function clampInteger(value: number | undefined, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(Math.round(value ?? min), min), max);
}

function readIntegerEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  const value = Number.parseInt(process.env[name] ?? "", 10);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(value, min), max);
}
