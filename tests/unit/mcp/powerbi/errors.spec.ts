// tests/unit/mcp/powerbi/errors.spec.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9

import { describe, it, expect } from 'vitest';
import {
  PowerBIPythonMissingError,
  PowerBIVenvMissingError,
  PowerBISubprocessError,
  PowerBIJsonInvalidError,
} from '../../../../apps/utility/src/mcp/powerbi/errors.js';

describe('PowerBI error types', () => {
  describe('PowerBIPythonMissingError', () => {
    it('has correct code and name', () => {
      const e = new PowerBIPythonMissingError();
      expect(e.code).toBe('POWERBI_PYTHON_MISSING');
      expect(e.name).toBe('PowerBIPythonMissingError');
      expect(e).toBeInstanceOf(Error);
    });

    it('message includes remediation', () => {
      const e = new PowerBIPythonMissingError();
      expect(e.message).toContain('brew install python@3.12');
    });

    it('accepts optional pythonPath', () => {
      const e = new PowerBIPythonMissingError('/usr/bin/python3');
      expect(e.message).toContain('/usr/bin/python3');
    });
  });

  describe('PowerBIVenvMissingError', () => {
    it('has correct code, name and projectPath', () => {
      const e = new PowerBIVenvMissingError('/some/project');
      expect(e.code).toBe('POWERBI_VENV_MISSING');
      expect(e.name).toBe('PowerBIVenvMissingError');
      expect(e.projectPath).toBe('/some/project');
    });

    it('message includes bootstrap command', () => {
      const e = new PowerBIVenvMissingError('/some/project');
      expect(e.message).toContain('python3 -m venv .venv');
      expect(e.message).toContain('pip install -r requirements.txt');
    });
  });

  describe('PowerBISubprocessError', () => {
    it('has correct code and preserves exitCode + stderrTail', () => {
      const e = new PowerBISubprocessError({ exitCode: 1, stderrTail: 'traceback' });
      expect(e.code).toBe('POWERBI_SUBPROCESS_ERROR');
      expect(e.exitCode).toBe(1);
      expect(e.stderrTail).toBe('traceback');
    });

    it('handles null exitCode (timeout case)', () => {
      const e = new PowerBISubprocessError({ exitCode: null, stderrTail: 'timeout' });
      expect(e.exitCode).toBeNull();
      expect(e.message).toContain('null');
    });
  });

  describe('PowerBIJsonInvalidError', () => {
    it('has correct code and preserves zodError + jsonPath', () => {
      const e = new PowerBIJsonInvalidError({ zodError: { issues: [] }, jsonPath: '/tmp/x.json' });
      expect(e.code).toBe('POWERBI_JSON_INVALID');
      expect(e.jsonPath).toBe('/tmp/x.json');
      expect(e.zodError).toEqual({ issues: [] });
    });

    it('message includes jsonPath', () => {
      const e = new PowerBIJsonInvalidError({ zodError: {}, jsonPath: '/tmp/cdash-abc.json' });
      expect(e.message).toContain('/tmp/cdash-abc.json');
    });
  });
});
