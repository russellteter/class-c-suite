// apps/utility/src/mcp/powerbi/schema.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9
//
// Zod schemas for the JSON shape emitted by customer-dashboard's `to_json()`.
// The Python project's `to_json()` serialises `processed_df.to_dict(orient="records")` —
// a flat array of per-account records. Column names are snake_case after COLUMN_MAPPINGS
// (config/settings.py line 336) is applied, with the primary join key staying as
// `Account ID 18 Digit` in the raw DataFrame (mapped to `account_id` via COLUMN_MAPPINGS).
//
// Strategy: z.passthrough() on the record shape — we enforce the fields that are
// critical for downstream lens consumption and C-Suite identity; all other fields
// are accepted without enumeration (the column set is 100+ fields and grows as the
// Python project adds enrichment waves). This avoids schema drift on every Python
// project update while still catching record-level structural failures.
//
// DECISION (ch.8 pbi): `--validate` flag in customer-dashboard short-circuits at
// line 506 of src/main.py, exiting BEFORE run_pipeline() runs — so the JSON file
// would never be written when --validate is passed. Subprocess command uses
// `-j /tmp/cdash-<runId>.json` only (no --validate).

import { z } from 'zod';

// A single per-account record.
// We validate only the fields the C-Suite lenses actually consume.
// All other fields pass through via .passthrough().
export const CustomerDashboardRecordSchema = z.object({
  // Primary join key — Salesforce 18-char ID
  // The Python project uses "Account ID 18 Digit" as the raw column name;
  // after COLUMN_MAPPINGS it surfaces as "account_id" in processed_df.
  // We accept both forms because the mapping may or may not be applied
  // depending on the DataProcessor code path.
  account_id: z.string().optional(),
  // Snake-case name after COLUMN_MAPPINGS
  account_name: z.string().optional(),
  // Commercial
  arr_usd: z.number().nullable().optional(),
  renewal_date: z.union([z.string(), z.null()]).optional(),
  // Raw usage signals (directive #1: health_score/health_status/health_category deprecated)
  // Usage (30/90-day Class minutes) — kit DATA_SCHEMA fields
  minutes_30d: z.number().nullable().optional(),
  minutes_90d: z.number().nullable().optional(),
  // Derived engagement metrics
  minutes_per_user: z.number().nullable().optional(),
  usage_trend_pct: z.number().nullable().optional(),   // 30d-vs-90d momentum
  active_days_90d: z.number().nullable().optional(),
  // Users
  max_users_30d: z.number().nullable().optional(),
  max_users_90d: z.number().nullable().optional(),
  // Renewal
  renewal_urgency: z.string().nullable().optional(),
  days_until_renewal: z.number().nullable().optional(),
  // Account metadata
  product_category: z.string().nullable().optional(),  // 'Class for Zoom' | 'Class for Microsoft Teams'
  subdomain: z.string().nullable().optional(),
  account_manager: z.string().nullable().optional(),
  // Support signals
  open_cases: z.number().nullable().optional(),
  avg_rating: z.number().nullable().optional(),
}).passthrough();

export type CustomerDashboardRecord = z.infer<typeof CustomerDashboardRecordSchema>;

// Top-level: array of records.
export const CustomerDashboardDataSchema = z.array(CustomerDashboardRecordSchema);

export type CustomerDashboardData = z.infer<typeof CustomerDashboardDataSchema>;
