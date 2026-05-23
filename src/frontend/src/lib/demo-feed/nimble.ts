const NIMBLE_SEARCH_URL = "https://sdk.nimbleway.com/v1/search";
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_QUERY_LENGTH = 500;
const MAX_RESULT_COUNT = 5;
const MAX_TEXT_LENGTH = 1200;

export type NimbleSearchFocus =
  | "general"
  | "news"
  | "location"
  | "coding"
  | "geo"
  | "shopping"
  | "social"
  | "academic";

export type NimbleSearchTimeRange = "hour" | "day" | "week" | "month" | "year";

export type NimbleSearchInput = {
  query: string;
  focus?: NimbleSearchFocus;
  timeRange?: NimbleSearchTimeRange;
  includeDomains?: string[];
  excludeDomains?: string[];
  maxResults?: number;
};

export type NimbleSearchResult = {
  title: string;
  url: string;
  description: string;
  content?: string;
  publishedDate?: string | null;
};

export type NimbleSearchOutput =
  | {
      ok: true;
      query: string;
      answer: string | null;
      results: NimbleSearchResult[];
      requestId: string | null;
      totalResults: number;
    }
  | {
      ok: false;
      code:
        | "not_configured"
        | "credits_exhausted"
        | "rate_limited"
        | "search_unavailable"
        | "search_invalid_response";
      query: string;
      answer?: null;
      results: NimbleSearchResult[];
      requestId?: string | null;
      totalResults?: number;
    };

type NimbleSearchResponse = {
  answer?: unknown;
  total_results?: unknown;
  results?: unknown;
  request_id?: unknown;
};

type NimbleResultResponse = {
  title?: unknown;
  description?: unknown;
  url?: unknown;
  content?: unknown;
  metadata?: {
    published_date?: unknown;
  };
};

export async function searchWithNimble(
  input: NimbleSearchInput,
  options: { abortSignal?: AbortSignal } = {},
): Promise<NimbleSearchOutput> {
  const apiKey = process.env.NIMBLE_API_KEY?.trim();
  const query = normalizeQuery(input.query);

  if (!apiKey) {
    return {
      ok: false,
      code: "not_configured",
      query,
      results: [],
      totalResults: 0,
    };
  }

  if (!query) {
    return {
      ok: false,
      code: "search_invalid_response",
      query,
      results: [],
      totalResults: 0,
    };
  }

  const timeoutSignal = AbortSignal.timeout(
    readIntegerEnv("NIMBLE_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 2000, 30000),
  );
  const signal = mergeAbortSignals(options.abortSignal, timeoutSignal);

  try {
    const response = await fetch(NIMBLE_SEARCH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildNimbleRequest({ ...input, query })),
      signal,
      cache: "no-store",
    });

    if (response.status === 402) {
      return {
        ok: false,
        code: "credits_exhausted",
        query,
        results: [],
        totalResults: 0,
      };
    }

    if (response.status === 429) {
      return {
        ok: false,
        code: "rate_limited",
        query,
        results: [],
        totalResults: 0,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        code: "search_unavailable",
        query,
        results: [],
        totalResults: 0,
      };
    }

    const payload = (await response.json().catch(() => null)) as
      | NimbleSearchResponse
      | null;

    if (!payload || !Array.isArray(payload.results)) {
      return {
        ok: false,
        code: "search_invalid_response",
        query,
        results: [],
        requestId: safeString(payload?.request_id, 128) || null,
        totalResults: 0,
      };
    }

    const results = payload.results
      .map((result) => normalizeResult(result as NimbleResultResponse))
      .filter((result): result is NimbleSearchResult => Boolean(result))
      .slice(0, getMaxResults(input.maxResults));

    return {
      ok: true,
      query,
      answer: safeString(payload.answer, MAX_TEXT_LENGTH) || null,
      results,
      requestId: safeString(payload.request_id, 128) || null,
      totalResults: clampInteger(Number(payload.total_results), 0, 10_000),
    };
  } catch (error) {
    if (isAbortLikeError(error) || error instanceof TypeError) {
      return {
        ok: false,
        code: "search_unavailable",
        query,
        results: [],
        totalResults: 0,
      };
    }

    console.warn("nimble search failed unexpectedly", {
      code: safeErrorCode(error),
    });

    return {
      ok: false,
      code: "search_unavailable",
      query,
      results: [],
      totalResults: 0,
    };
  }
}

function buildNimbleRequest(input: NimbleSearchInput) {
  return {
    query: normalizeQuery(input.query),
    locale: "en-US",
    country: "US",
    output_format: "markdown",
    max_results: getMaxResults(input.maxResults),
    focus: input.focus ?? "general",
    search_depth: "lite",
    include_answer: readBooleanEnv("NIMBLE_INCLUDE_ANSWER", false),
    ...(input.timeRange ? { time_range: input.timeRange } : {}),
    ...(input.includeDomains?.length
      ? { include_domains: normalizeDomains(input.includeDomains) }
      : {}),
    ...(input.excludeDomains?.length
      ? { exclude_domains: normalizeDomains(input.excludeDomains) }
      : {}),
  };
}

function normalizeResult(result: NimbleResultResponse): NimbleSearchResult | null {
  const title = safeString(result.title, 240);
  const url = safeUrl(result.url);

  if (!title || !url) {
    return null;
  }

  return {
    title,
    url,
    description: safeString(result.description, 500),
    content: safeString(result.content, MAX_TEXT_LENGTH) || undefined,
    publishedDate: safeString(result.metadata?.published_date, 64) || null,
  };
}

function normalizeQuery(query: unknown) {
  return safeString(query, MAX_QUERY_LENGTH);
}

function normalizeDomains(domains: string[]) {
  return domains
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain))
    .slice(0, 20);
}

function safeUrl(value: unknown) {
  const url = safeString(value, 500);

  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

function safeString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getMaxResults(value: number | undefined) {
  return clampInteger(value ?? 3, 1, MAX_RESULT_COUNT);
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

function readBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value);
}

function mergeAbortSignals(...signals: Array<AbortSignal | undefined>) {
  const activeSignals = signals.filter((signal): signal is AbortSignal =>
    Boolean(signal),
  );

  if (activeSignals.length === 1) {
    return activeSignals[0];
  }

  const controller = new AbortController();

  for (const signal of activeSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener(
      "abort",
      () => {
        controller.abort(signal.reason);
      },
      { once: true },
    );
  }

  return controller.signal;
}

function isAbortLikeError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function safeErrorCode(error: unknown) {
  if (error instanceof Error && error.name) {
    return error.name.replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 80);
  }

  return "unknown_error";
}
