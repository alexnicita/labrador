import type { DemoFeedRow } from "@/lib/demo-feed/types";

export const DEMO_AI_MESSAGE_LIMIT = 10_000;
export const DEMO_COLLABORATION_URL = "https://x.com/NicitaAlex";
export const DEMO_MESSAGE_LIMIT_CODE = "message_limit_reached";

const REDACTION = "[redacted secret]";

const secretPatterns: RegExp[] = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
];

const assignmentSecretPattern =
  /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|auth[_-]?token|client[_-]?secret|secret|password|passwd|pwd)\b\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}["']?/gi;

const promptInjectionPatterns: RegExp[] = [
  /\b(ignore|disregard|forget|override)\s+(all\s+)?(previous|prior|above|system|developer)\s+(instructions|rules|messages|prompt)\b/i,
  /\b(reveal|print|dump|show|exfiltrate|leak)\b[\s\S]{0,80}\b(system prompt|developer prompt|hidden prompt|instructions|api keys?|secrets?|tokens?)\b/i,
  /\b(system|developer|tool)\s*:\s*(ignore|override|reveal|print|dump|show)\b/i,
  /<\/?(system|developer|tool|assistant)\b/i,
  /\bBEGIN\s+(SYSTEM|DEVELOPER|TOOL)\s+PROMPT\b/i,
];

export type DemoTextProtectionResult = {
  text: string;
  secretsRedacted: boolean;
  promptInjectionRisk: boolean;
};

export class DemoMessageLimitReachedError extends Error {
  readonly code = DEMO_MESSAGE_LIMIT_CODE;

  constructor() {
    super("The demo room has reached the saved message limit.");
  }
}

export function isDemoMessageLimitReachedError(
  error: unknown,
): error is DemoMessageLimitReachedError {
  return (
    error instanceof DemoMessageLimitReachedError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === DEMO_MESSAGE_LIMIT_CODE)
  );
}

export function protectDemoText(value: string): DemoTextProtectionResult {
  let text = value;
  let secretsRedacted = false;

  for (const pattern of secretPatterns) {
    text = text.replace(pattern, () => {
      secretsRedacted = true;
      return REDACTION;
    });
  }

  text = text.replace(assignmentSecretPattern, (match, label: string) => {
    secretsRedacted = true;
    const separator = match.includes(":") ? ":" : "=";
    return `${label}${separator} ${REDACTION}`;
  });

  return {
    text,
    secretsRedacted,
    promptInjectionRisk: promptInjectionPatterns.some((pattern) =>
      pattern.test(value),
    ),
  };
}

export function sanitizeDemoTextForPersistence(value: string) {
  return protectDemoText(value).text;
}

export function sanitizeDemoFeedRowForAi(row: DemoFeedRow): DemoFeedRow {
  if (!row.body) {
    return row;
  }

  return {
    ...row,
    body: protectDemoText(row.body).text,
  };
}

export function hasUnsafeExternalToolText(value: string) {
  const protection = protectDemoText(value);
  return protection.secretsRedacted || protection.promptInjectionRisk;
}
