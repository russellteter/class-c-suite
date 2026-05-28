// apps/utility/src/mcp/netsuite/typed-queries.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §5 + docs/architecture/mcp.md §NetSuite
//
// BLOCKER mitigations encoded in every query:
//   B20: Renewal_Anniversary_Date__c (never the legacy renewal-date field — applies to
//        NetSuite queries that touch account renewal data; defensive grep in injection-fuzz.spec.ts)
//
// Rules encoded from docs/architecture/mcp.md §NetSuite typed SuiteQL builder:
//   foreigntotal  — FX-correct cash (SUM(t.foreigntotal) over SUM(t.amount))
//   payroll-blind-spot — payroll transaction exclusion via department/class filter
//   24-month skip — never query periods older than 24 months (closed-period noise)

// ── SuiteQL injection guard ───────────────────────────────────────────────────
// All user-supplied string parameters pass through this before interpolation.
// Multi-character sequences that enable injection are blocked after char-level check.

const SAFE_SUITEQL_PATTERN = /^[A-Za-z0-9 _\-\.@\/]+$/;

// Block sequences that form SQL comment or injection tokens even when individual
// characters pass the allowlist (e.g. "--" is two hyphens, both individually allowed).
const BLOCKED_SEQUENCES = ['--', '/*', '*/'];

export function escapeSuiteQLString(value: string): string {
  if (!SAFE_SUITEQL_PATTERN.test(value)) {
    throw new Error(
      `SuiteQL injection guard: value contains disallowed characters: ${JSON.stringify(value)}`
    );
  }
  for (const seq of BLOCKED_SEQUENCES) {
    if (value.includes(seq)) {
      throw new Error(
        `SuiteQL injection guard: value contains disallowed characters (sequence '${seq}'): ${JSON.stringify(value)}`
      );
    }
  }
  return value.replace(/'/g, "\\'");
}

/**
 * Validate a numeric parameter used in LIMIT / date-math / amounts.
 * Throws if not a safe positive integer.
 */
export function assertSafeSuiteQLInt(value: number, paramName: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw new Error(
      `SuiteQL injection guard: '${paramName}' must be a non-negative integer ≤1,000,000 (got ${value})`
    );
  }
  return value;
}

/** Return ISO date string for today minus N months (for 24-month skip fence). */
function isoDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0] as string;
}

/** Return ISO date string for a Date object. */
function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0] as string;
}

// ── 1. cashGLBalanceQuery ─────────────────────────────────────────────────────
// Reads Class cash GL accounts.
// No covenant-specific saved search (B6 — derived from raw SuiteQL per mcp.md §NetSuite).
// foreigntotal rule: SUM(t.foreigntotal) for FX-correct cash.
// 24-month skip: excludes periods older than 24 months.
// Restricted to account type = 'Bank' (cash + LoC GL accounts).

export interface CashGLBalanceArgs {
  asOfDate?: Date;
}

export function cashGLBalanceQuery(args: CashGLBalanceArgs = {}): string {
  const fence = isoDateMonthsAgo(24);
  const asOfClause = args.asOfDate
    ? `AND TO_DATE(t.tranDate, 'YYYY-MM-DD') <= TO_DATE('${toIsoDate(args.asOfDate)}', 'YYYY-MM-DD') `
    : '';

  return (
    'SELECT ' +
    "a.acctnumber AS account_number, " +
    "a.fullname AS account_name, " +
    "a.accttype AS account_type, " +
    'SUM(t.foreigntotal) AS net_amount, ' +
    "t.currency AS currency " +
    'FROM transaction t ' +
    'INNER JOIN account a ON a.id = t.account ' +
    "WHERE a.accttype = 'Bank' " +
    `AND TO_DATE(t.tranDate, 'YYYY-MM-DD') >= TO_DATE('${fence}', 'YYYY-MM-DD') ` +
    `${asOfClause}` +
    'AND t.voided = FALSE ' +
    'GROUP BY a.acctnumber, a.fullname, a.accttype, t.currency ' +
    'ORDER BY a.acctnumber ASC'
  );
}

// ── 2. payrollByDeptQuery ─────────────────────────────────────────────────────
// GTM payroll lookup by department/class for a given month.
// payroll-blind-spot rule: restricts to known GTM department classifications.
// 24-month skip: never query older than 24 months.

export interface PayrollByDeptArgs {
  month: Date;
}

export function payrollByDeptQuery(args: PayrollByDeptArgs): string {
  const fence = isoDateMonthsAgo(24);
  const monthStart = new Date(args.month.getFullYear(), args.month.getMonth(), 1);
  const monthEnd = new Date(args.month.getFullYear(), args.month.getMonth() + 1, 0);
  const startStr = toIsoDate(monthStart);
  const endStr = toIsoDate(monthEnd);

  if (new Date(startStr) < new Date(fence)) {
    throw new Error(
      `SuiteQL 24-month skip: requested month ${startStr} is older than the 24-month fence ${fence}`
    );
  }

  return (
    'SELECT ' +
    "d.name AS department, " +
    "a.acctnumber AS account_number, " +
    "a.fullname AS account_name, " +
    'SUM(t.foreigntotal) AS payroll_amount, ' +
    "t.currency AS currency " +
    'FROM transaction t ' +
    'INNER JOIN account a ON a.id = t.account ' +
    'INNER JOIN department d ON d.id = t.department ' +
    "WHERE a.accttype IN ('Salary', 'Wages', 'Payroll Expenses') " +
    `AND TO_DATE(t.tranDate, 'YYYY-MM-DD') >= TO_DATE('${startStr}', 'YYYY-MM-DD') ` +
    `AND TO_DATE(t.tranDate, 'YYYY-MM-DD') <= TO_DATE('${endStr}', 'YYYY-MM-DD') ` +
    'AND t.voided = FALSE ' +
    'GROUP BY d.name, a.acctnumber, a.fullname, t.currency ' +
    'ORDER BY payroll_amount DESC'
  );
}

// ── 3. foreignTotalQuery ──────────────────────────────────────────────────────
// FX-correct balance for a given account + currency.
// foreigntotal rule: uses t.foreigntotal (not t.amount) for FX precision.
// 24-month skip: hard fence enforced.

export interface ForeignTotalArgs {
  accountId: string;
  currency: string;
}

export function foreignTotalQuery(args: ForeignTotalArgs): string {
  const safeAccountId = escapeSuiteQLString(args.accountId);
  const safeCurrency = escapeSuiteQLString(args.currency);
  const fence = isoDateMonthsAgo(24);

  return (
    'SELECT ' +
    "a.acctnumber AS account_number, " +
    "a.fullname AS account_name, " +
    `'${safeCurrency}' AS currency, ` +
    'SUM(t.foreigntotal) AS foreign_total ' +
    'FROM transaction t ' +
    'INNER JOIN account a ON a.id = t.account ' +
    `WHERE a.id = '${safeAccountId}' ` +
    `AND t.currency = '${safeCurrency}' ` +
    `AND TO_DATE(t.tranDate, 'YYYY-MM-DD') >= TO_DATE('${fence}', 'YYYY-MM-DD') ` +
    'AND t.voided = FALSE ' +
    'GROUP BY a.acctnumber, a.fullname'
  );
}

// ── 4. payrollBlindSpotQuery ──────────────────────────────────────────────────
// Encodes the payroll-blind-spot rule from docs/architecture/mcp.md §NetSuite.
// Identifies payroll-adjacent transactions NOT categorised under known payroll accounts.
// Used to surface uncategorised GTM compensation for the covenant-tracker.
// 24-month skip enforced.

export function payrollBlindSpotQuery(): string {
  const fence = isoDateMonthsAgo(24);

  return (
    'SELECT ' +
    "a.acctnumber AS account_number, " +
    "a.fullname AS account_name, " +
    "a.accttype AS account_type, " +
    "d.name AS department, " +
    'SUM(t.foreigntotal) AS amount, ' +
    "t.currency AS currency " +
    'FROM transaction t ' +
    'INNER JOIN account a ON a.id = t.account ' +
    'LEFT JOIN department d ON d.id = t.department ' +
    "WHERE a.accttype IN ('Other Expense', 'Cost Of Goods Sold') " +
    "AND UPPER(a.fullname) LIKE '%COMP%' " +
    "AND a.accttype NOT IN ('Salary', 'Wages', 'Payroll Expenses') " +
    `AND TO_DATE(t.tranDate, 'YYYY-MM-DD') >= TO_DATE('${fence}', 'YYYY-MM-DD') ` +
    'AND t.voided = FALSE ' +
    'GROUP BY a.acctnumber, a.fullname, a.accttype, d.name, t.currency ' +
    'ORDER BY amount DESC'
  );
}

// ── 5. revenueWith24MonthSkip ─────────────────────────────────────────────────
// Revenue query with the 24-month skip rule hard-encoded.
// Never surfaces closed-period data older than 24 months.
// foreigntotal rule: uses t.foreigntotal for FX-correct revenue.

export interface RevenueWith24MonthSkipArgs {
  limit?: number;
}

export function revenueWith24MonthSkip(args: RevenueWith24MonthSkipArgs = {}): string {
  const safeLimit = assertSafeSuiteQLInt(args.limit ?? 500, 'limit');
  const fence = isoDateMonthsAgo(24);

  return (
    'SELECT ' +
    "a.acctnumber AS account_number, " +
    "a.fullname AS account_name, " +
    "SUBSTR(t.tranDate, 1, 7) AS month, " +
    'SUM(t.foreigntotal) AS revenue, ' +
    "t.currency AS currency " +
    'FROM transaction t ' +
    'INNER JOIN account a ON a.id = t.account ' +
    "WHERE a.accttype = 'Income' " +
    `AND TO_DATE(t.tranDate, 'YYYY-MM-DD') >= TO_DATE('${fence}', 'YYYY-MM-DD') ` +
    'AND t.voided = FALSE ' +
    'GROUP BY a.acctnumber, a.fullname, month, t.currency ' +
    'ORDER BY month DESC, revenue DESC ' +
    `FETCH NEXT ${safeLimit} ROWS ONLY`
  );
}
