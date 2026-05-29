// packages/shared-types/src/mcp.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §3.1
// Shared MCP types — framework contract for all 5 V1 MCP clients.
// All service-specific clients extend McpClient with typed query methods.

import { z } from 'zod';

// ── McpServiceId ──────────────────────────────────────────────────────────────

export type McpServiceId =
  | 'salesforce'
  | 'netsuite'
  | 'aws'
  | 'gmail'
  | 'chorus'
  | 'powerbi';

export const McpServiceIdSchema = z.enum([
  'salesforce',
  'netsuite',
  'aws',
  'gmail',
  'chorus',
  'powerbi',
]);

// ── CredentialType ────────────────────────────────────────────────────────────

export type CredentialType =
  | 'oauth_refresh_token'
  | 'tba_token'
  | 'api_key'
  | 'sso_profile_ref';

export const CredentialTypeSchema = z.enum([
  'oauth_refresh_token',
  'tba_token',
  'api_key',
  'sso_profile_ref',
]);

// ── McpHealth ─────────────────────────────────────────────────────────────────

export interface McpHealth {
  ok: boolean;
  lastSuccessAt?: Date;
  lastError?: string;
  authMode: 'oauth' | 'tba' | 'sso' | 'api_key' | 'subprocess' | 'sfdx';
}

export const McpHealthSchema = z.object({
  ok: z.boolean(),
  lastSuccessAt: z.date().optional(),
  lastError: z.string().optional(),
  authMode: z.enum(['oauth', 'tba', 'sso', 'api_key', 'subprocess', 'sfdx']),
});

// ── McpClient — base contract all service clients implement ──────────────────

export interface McpClient {
  serviceId: McpServiceId;
  isAuthenticated(): Promise<boolean>;
  reconnect(): Promise<void>;
  healthCheck(): Promise<McpHealth>;
}

// ── Typed client interfaces (real shapes — replaces stubs in playbook.ts) ────
// playbook.ts re-exports these for back-compat. Stubs are retired in Ch.8.

/** Options for query methods that are expected to return rows. */
export interface QueryExpectOptions {
  /** When true, a zero-row result attaches a schemaDriftAdvisory. */
  expectRows?: boolean;
}

export interface SalesforceClient extends McpClient {
  serviceId: 'salesforce';
  query(soql: string, opts?: QueryExpectOptions): Promise<SalesforceQueryResult>;
  queryAll(soql: string, opts?: QueryExpectOptions): Promise<SalesforceQueryResult>;
  describeObject(name: string): Promise<SalesforceDescribeResult>;
}

export interface NetSuiteClient extends McpClient {
  serviceId: 'netsuite';
  /** Returns null + sets degraded=true when TBA credentials are absent (token-absent mode). */
  runSuiteQL(query: string, opts?: QueryExpectOptions): Promise<NetSuiteQueryResult | null>;
  /** Returns null + sets degraded=true when TBA credentials are absent (token-absent mode). */
  runSavedSearch(id: string, opts?: QueryExpectOptions): Promise<NetSuiteQueryResult | null>;
  degraded: boolean;
  /**
   * Returns true if the role can read the given SuiteQL table.
   * Probes once + caches per client instance. Known-blocked tables return false immediately.
   * Token-absent mode always returns false.
   */
  isNetSuiteTableReadable(table: string): Promise<boolean>;
}

export interface AwsClient extends McpClient {
  serviceId: 'aws';
  getCostExplorer(args: { profile: string; start: string; end: string }): Promise<unknown>;
  getOrganizationAccounts(args: { profile: string }): Promise<unknown>;
}

export interface GmailClient extends McpClient {
  serviceId: 'gmail';
  searchThreads(query: string, options?: { maxResults?: number }): Promise<GmailThreadList>;
  getThread(id: string): Promise<GmailThread>;
  getMessage(id: string): Promise<GmailMessage>;
}

export interface ChorusClient extends McpClient {
  serviceId: 'chorus';
  /** All results carry sourceConfidenceCap: 69 per BLOCKERS B11. */
  listEngagements(args: { since: Date }): Promise<ChorusEngagement[]>;
  getEngagementSummary(id: string): Promise<ChorusSummary>;
  searchCallsByParticipant(args: { name: string }): Promise<ChorusEngagement[]>;
}

export interface PowerBiClient extends McpClient {
  serviceId: 'powerbi';
  runFullExport(args: { runId: string }): Promise<unknown>;
  getAccountUsage(args: { accountId18: string }): Promise<unknown>;
}

// ── Schema-drift advisory ─────────────────────────────────────────────────────
// Attached to query results that returned zero rows when rows were expected.
// Signals possible schema drift (renamed stage/field/column) rather than
// authoritative "no data". The lens/memo layer should render this as an
// uncertainty flag, not assert an empty result as a factual claim.
//
// Canonical message — import and compare to avoid hard-coding the string in tests.
export const SCHEMA_DRIFT_ADVISORY_SF =
  '0 rows — verify SOQL stage labels / field names against the live Salesforce org; ' +
  'may be schema drift (renamed stage/field), not truly empty pipeline/data';

export const SCHEMA_DRIFT_ADVISORY_NS =
  '0 rows — verify SuiteQL column names / account types against the live NetSuite org; ' +
  'may be schema drift (renamed column/type) or permission block, not truly empty cash/payroll data';

// ── Salesforce wire shapes ────────────────────────────────────────────────────

export interface SalesforceQueryResult {
  totalSize: number;
  done: boolean;
  records: Record<string, unknown>[];
  nextRecordsUrl?: string;
  /** Present when expectRows=true was set and zero records were returned. */
  schemaDriftAdvisory?: string;
}

export interface SalesforceDescribeResult {
  name: string;
  fields: SalesforceField[];
}

export interface SalesforceField {
  name: string;
  type: string;
  label: string;
  nillable: boolean;
}

// ── NetSuite wire shapes ──────────────────────────────────────────────────────

export interface NetSuiteQueryResult {
  items: Record<string, unknown>[];
  count: number;
  hasMore: boolean;
  /** Present when expectRows=true was set and zero items were returned. */
  schemaDriftAdvisory?: string;
}

// ── Gmail wire shapes ─────────────────────────────────────────────────────────

export interface GmailThreadList {
  threads: Array<{ id: string; snippet: string }>;
  resultSizeEstimate: number;
}

export interface GmailThread {
  id: string;
  messages: GmailMessage[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  snippet?: string;
  body?: string;
}

// ── Chorus wire shapes ────────────────────────────────────────────────────────

export interface ChorusEngagement {
  id: string;
  title: string;
  date: string;
  participants: string[];
  /** Always 69 per B11 cap. */
  sourceConfidenceCap: 69;
  source_type: 'chorus';
}

export interface ChorusSummary {
  id: string;
  summary: string;
  keyTopics: string[];
  /** Always 69 per B11 cap. */
  sourceConfidenceCap: 69;
  source_type: 'chorus';
}

// ── Zod schemas for wire-crossing validation ──────────────────────────────────

export const SalesforceQueryResultSchema = z.object({
  totalSize: z.number(),
  done: z.boolean(),
  records: z.array(z.record(z.string(), z.unknown())),
  nextRecordsUrl: z.string().optional(),
  schemaDriftAdvisory: z.string().optional(),
});

export const NetSuiteQueryResultSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
  count: z.number(),
  hasMore: z.boolean(),
  schemaDriftAdvisory: z.string().optional(),
});
