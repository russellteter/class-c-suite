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

export interface SalesforceClient extends McpClient {
  serviceId: 'salesforce';
  query(soql: string): Promise<SalesforceQueryResult>;
  queryAll(soql: string): Promise<SalesforceQueryResult>;
  describeObject(name: string): Promise<SalesforceDescribeResult>;
}

export interface NetSuiteClient extends McpClient {
  serviceId: 'netsuite';
  /** Returns null + sets degraded=true when TBA credentials are absent (token-absent mode). */
  runSuiteQL(query: string): Promise<NetSuiteQueryResult | null>;
  /** Returns null + sets degraded=true when TBA credentials are absent (token-absent mode). */
  runSavedSearch(id: string): Promise<NetSuiteQueryResult | null>;
  degraded: boolean;
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

// ── Salesforce wire shapes ────────────────────────────────────────────────────

export interface SalesforceQueryResult {
  totalSize: number;
  done: boolean;
  records: Record<string, unknown>[];
  nextRecordsUrl?: string;
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
});

export const NetSuiteQueryResultSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
  count: z.number(),
  hasMore: z.boolean(),
});
