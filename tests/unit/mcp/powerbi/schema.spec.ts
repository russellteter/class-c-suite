// tests/unit/mcp/powerbi/schema.spec.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9

import { describe, it, expect } from 'vitest';
import {
  CustomerDashboardRecordSchema,
  CustomerDashboardDataSchema,
} from '../../../../apps/utility/src/mcp/powerbi/schema.js';

// Minimal valid record (all critical fields optional — passthrough)
const validRecord = {
  account_id: '001Fk00000AbcDE18X',
  account_name: 'Acme University',
  arr_usd: 95000,
  health_score: 72,
  health_category: 'Healthy',
  minutes_30d: 120000,
  minutes_90d: 350000,
  renewal_date: '2026-12-31',
  account_manager: 'Jane Smith',
  // extra passthrough field
  custom_field_xyz: 'should pass through',
};

describe('CustomerDashboardRecordSchema', () => {
  it('accepts a valid record', () => {
    const result = CustomerDashboardRecordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });

  it('passes through unknown fields (passthrough mode)', () => {
    const result = CustomerDashboardRecordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)['custom_field_xyz']).toBe('should pass through');
    }
  });

  it('accepts a record with all optional fields absent', () => {
    const result = CustomerDashboardRecordSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts null for nullable numeric fields', () => {
    const result = CustomerDashboardRecordSchema.safeParse({
      account_id: '001XYZ',
      arr_usd: null,
      health_score: null,
      minutes_30d: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-object input', () => {
    const result = CustomerDashboardRecordSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });

  it('rejects array input for record', () => {
    const result = CustomerDashboardRecordSchema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it('accepts raw Excel-style field names via passthrough', () => {
    const result = CustomerDashboardRecordSchema.safeParse({
      'Account ID 18 Digit': '001XXXXXXXXXXX18DIG',
      'Health Score': 55,
      'Account Name': 'Test School',
    });
    expect(result.success).toBe(true);
  });
});

describe('CustomerDashboardDataSchema', () => {
  it('accepts an array of valid records', () => {
    const result = CustomerDashboardDataSchema.safeParse([validRecord, validRecord]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('accepts an empty array', () => {
    const result = CustomerDashboardDataSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('rejects non-array input', () => {
    const result = CustomerDashboardDataSchema.safeParse(validRecord);
    expect(result.success).toBe(false);
  });

  it('rejects array containing a non-object element', () => {
    const result = CustomerDashboardDataSchema.safeParse([validRecord, 'bad']);
    expect(result.success).toBe(false);
  });

  it('rejects null at top level', () => {
    const result = CustomerDashboardDataSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it('handles mixed valid + passthrough fields across records', () => {
    const record2 = { account_id: '002ABC', extra_wave5_field: 99 };
    const result = CustomerDashboardDataSchema.safeParse([validRecord, record2]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data[1] as Record<string, unknown>)['extra_wave5_field']).toBe(99);
    }
  });
});
