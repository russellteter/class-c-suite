// apps/utility/src/mcp/gmail/typed-queries.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §7
//
// Gmail search query builders for use by playbooks.
// Gmail query syntax uses slash-dates (YYYY/MM/DD), not ISO.
// Injection guard is email/date safe — not SOQL character set.

// ── Injection guard ───────────────────────────────────────────────────────────
// Email addresses, keyword strings, and dates pass through before interpolation.
// Prevents Gmail query injection via crafted stakeholder email addresses.

// Email: RFC 5321 minimal safe set + common local-part chars.
const SAFE_EMAIL_PATTERN = /^[A-Za-z0-9._%+\-@]+$/;
// Keywords: letters, numbers, spaces, hyphens, dots, underscores — no operators.
const SAFE_KEYWORD_PATTERN = /^[A-Za-z0-9 .\-_]+$/;

export function assertSafeEmail(email: string): string {
  if (!SAFE_EMAIL_PATTERN.test(email)) {
    throw new Error(
      `Gmail query guard: email contains disallowed characters: ${JSON.stringify(email)}`
    );
  }
  return email;
}

export function assertSafeKeyword(keyword: string): string {
  if (!SAFE_KEYWORD_PATTERN.test(keyword)) {
    throw new Error(
      `Gmail query guard: keyword contains disallowed characters: ${JSON.stringify(keyword)}`
    );
  }
  return keyword;
}

/**
 * Format a Date as YYYY/MM/DD for Gmail's after: operator.
 * Gmail uses slash-dates, not ISO dash-dates.
 */
export function toGmailDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

// ── 1. recentThreadsByStakeholderQuery ────────────────────────────────────────
// Used by stakeholder_1_1 playbook.
// Finds threads where the stakeholder is sender or recipient.

export interface RecentThreadsByStakeholderArgs {
  stakeholderEmail: string;
  since: Date;
}

export function recentThreadsByStakeholderQuery(
  args: RecentThreadsByStakeholderArgs
): string {
  const safeEmail = assertSafeEmail(args.stakeholderEmail);
  const sinceStr = toGmailDate(args.since);
  return `from:${safeEmail} OR to:${safeEmail} after:${sinceStr}`;
}

// ── 2. recentExecCorrespondenceQuery ─────────────────────────────────────────
// Used by board_narrative + restructure_decision playbooks.
// Finds threads matching any of the supplied keywords since a date.

export interface RecentExecCorrespondenceArgs {
  keywords: string[];
  since: Date;
}

export function recentExecCorrespondenceQuery(
  args: RecentExecCorrespondenceArgs
): string {
  if (args.keywords.length === 0) {
    throw new Error('recentExecCorrespondenceQuery: keywords array must not be empty');
  }
  const safeKeywords = args.keywords.map(k => assertSafeKeyword(k));
  const sinceStr = toGmailDate(args.since);
  // Join keywords with OR; wrap each in quotes to treat as phrase.
  const keywordExpr = safeKeywords.map(k => `"${k}"`).join(' OR ');
  return `(${keywordExpr}) after:${sinceStr}`;
}
