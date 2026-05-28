// tests/unit/mcp/aws/errors.spec.ts
import { describe, it, expect } from 'vitest';
import {
  AWSError,
  AWSProfileNotFoundError,
  AWSSSOExpiredError,
  AWSCostExplorerError,
} from '../../../../apps/utility/src/mcp/aws/errors.js';

describe('AWSError base', () => {
  it('sets name and message', () => {
    const e = new AWSError('base error');
    expect(e.name).toBe('AWSError');
    expect(e.message).toBe('base error');
  });

  it('preserves cause', () => {
    const cause = new Error('root');
    const e = new AWSError('wrapped', cause);
    expect(e.cause).toBe(cause);
  });
});

describe('AWSProfileNotFoundError', () => {
  it('names the missing profile', () => {
    const e = new AWSProfileNotFoundError('class');
    expect(e.name).toBe('AWSProfileNotFoundError');
    expect(e.profile).toBe('class');
    expect(e.message).toContain('class');
  });

  it('is an instanceof AWSError', () => {
    expect(new AWSProfileNotFoundError('collab')).toBeInstanceOf(AWSError);
  });
});

describe('AWSSSOExpiredError', () => {
  it('names the expired profile', () => {
    const e = new AWSSSOExpiredError('collab');
    expect(e.name).toBe('AWSSSOExpiredError');
    expect(e.profile).toBe('collab');
    expect(e.message).toContain('aws sso login');
  });

  it('is an instanceof AWSError', () => {
    expect(new AWSSSOExpiredError('class')).toBeInstanceOf(AWSError);
  });
});

describe('AWSCostExplorerError', () => {
  it('sets message', () => {
    const e = new AWSCostExplorerError('cost failure');
    expect(e.name).toBe('AWSCostExplorerError');
    expect(e.message).toBe('cost failure');
  });
});
