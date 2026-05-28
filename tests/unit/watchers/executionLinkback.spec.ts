/**
 * Ch.9 — executionLinkback watcher specs.
 * Source: docs/decisions/0011-ch9-cowork-handoff.md §6 + AC-9 + AC-10
 * Tests: path parsing, resolveOriginPath, appendExecutedBy, idempotency, edge cases.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import {
  parseDecisionIdFromPath,
  resolveOriginPath,
  appendExecutedBy,
} from '../../../apps/utility/src/watchers/executionLinkback.js';

// --- Helpers ---

async function withTempVault(fn: (vaultPath: string) => Promise<void>): Promise<void> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'linkback-test-'));
  try {
    await fn(tmp);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

function makeDecisionFile(decisionId: string, existingExecutedBy: string | string[] | null = null): string {
  const executedByYaml = existingExecutedBy === null
    ? 'executed_by: null'
    : Array.isArray(existingExecutedBy)
      ? `executed_by:\n${existingExecutedBy.map(p => `  - ${p}`).join('\n')}`
      : `executed_by: '${existingExecutedBy}'`;

  return `---
id: ${decisionId}
title: Test Decision
date_proposed: '2026-05-27'
decision_maker: Russell Teter
status: proposed
reversibility: medium
source: run-test
${executedByYaml}
---

## Body
Decision content.
`;
}

// --- parseDecisionIdFromPath ---

describe('parseDecisionIdFromPath', () => {
  it('extracts decision-id from standard path', () => {
    const executionsDir = '/vault/executions';
    const absPath = '/vault/executions/DEC-007/Q3-plan.docx';
    expect(parseDecisionIdFromPath(absPath, executionsDir)).toBe('DEC-007');
  });

  it('returns null for path outside executions dir', () => {
    const executionsDir = '/vault/executions';
    expect(parseDecisionIdFromPath('/vault/decisions/DEC-001.md', executionsDir)).toBeNull();
  });

  it('returns null for single-segment path (no artifact name)', () => {
    const executionsDir = '/vault/executions';
    expect(parseDecisionIdFromPath('/vault/executions/DEC-007', executionsDir)).toBeNull();
  });

  it('handles nested artifact paths correctly', () => {
    const executionsDir = '/vault/executions';
    const absPath = '/vault/executions/DEC-007/subdir/artifact.pptx';
    expect(parseDecisionIdFromPath(absPath, executionsDir)).toBe('DEC-007');
  });

  it('handles memo slug as decision-id segment', () => {
    const executionsDir = '/vault/executions';
    const absPath = '/vault/executions/board-update-memo/board-deck.pptx';
    expect(parseDecisionIdFromPath(absPath, executionsDir)).toBe('board-update-memo');
  });
});

// --- resolveOriginPath ---

describe('resolveOriginPath', () => {
  it('DEC-NNN → decisions directory', () => {
    const result = resolveOriginPath('DEC-007', '/vault');
    expect(result).toBe('/vault/decisions/DEC-007.md');
  });

  it('POS-NNN → positions directory', () => {
    const result = resolveOriginPath('POS-014', '/vault');
    expect(result).toBe('/vault/positions/POS-014.md');
  });

  it('PM-NNN → pre-mortems directory', () => {
    const result = resolveOriginPath('PM-001', '/vault');
    expect(result).toBe('/vault/pre-mortems/PM-001.md');
  });

  it('unknown ID → memos directory (slug convention)', () => {
    const result = resolveOriginPath('board-update-memo', '/vault');
    expect(result).toBe('/vault/memos/board-update-memo.md');
  });

  it('case-insensitive match for DEC', () => {
    const result = resolveOriginPath('dec-007', '/vault');
    expect(result).toBe('/vault/decisions/dec-007.md');
  });
});

// --- appendExecutedBy ---

describe('appendExecutedBy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appends execution path to null executed_by', async () => {
    await withTempVault(async (vault) => {
      const decPath = path.join(vault, 'decisions', 'DEC-007.md');
      await fs.mkdir(path.dirname(decPath), { recursive: true });
      await fs.writeFile(decPath, makeDecisionFile('DEC-007', null));

      const safeWriteMod = await import('../../../apps/utility/src/safewrite/index.js');
      let writtenContent = '';
      vi.spyOn(safeWriteMod, 'safeWrite').mockImplementation(async (args) => {
        writtenContent = args.content;
        return { ok: true, sha: 'sha-123' };
      });

      const result = await appendExecutedBy(decPath, 'executions/DEC-007/Q3-plan.docx', 'run-test');
      expect(result.updated).toBe(true);
      expect(writtenContent).toContain('executions/DEC-007/Q3-plan.docx');
    });
  });

  it('is idempotent — re-detecting same file does not double-append', async () => {
    await withTempVault(async (vault) => {
      const decPath = path.join(vault, 'decisions', 'DEC-007.md');
      await fs.mkdir(path.dirname(decPath), { recursive: true });
      // Start with the path already in executed_by
      await fs.writeFile(decPath, makeDecisionFile('DEC-007', ['executions/DEC-007/Q3-plan.docx']));

      const safeWriteMod = await import('../../../apps/utility/src/safewrite/index.js');
      const spy = vi.spyOn(safeWriteMod, 'safeWrite').mockResolvedValue({ ok: true, sha: 'sha' });

      const result = await appendExecutedBy(decPath, 'executions/DEC-007/Q3-plan.docx', 'run-test');
      expect(result.updated).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it('appends second execution path to existing array', async () => {
    await withTempVault(async (vault) => {
      const decPath = path.join(vault, 'decisions', 'DEC-007.md');
      await fs.mkdir(path.dirname(decPath), { recursive: true });
      await fs.writeFile(decPath, makeDecisionFile('DEC-007', ['executions/DEC-007/Q3-plan.docx']));

      const safeWriteMod = await import('../../../apps/utility/src/safewrite/index.js');
      let writtenContent = '';
      vi.spyOn(safeWriteMod, 'safeWrite').mockImplementation(async (args) => {
        writtenContent = args.content;
        return { ok: true, sha: 'sha' };
      });

      const result = await appendExecutedBy(decPath, 'executions/DEC-007/Q3-deck.pptx', 'run-test');
      expect(result.updated).toBe(true);
      expect(writtenContent).toContain('executions/DEC-007/Q3-plan.docx');
      expect(writtenContent).toContain('executions/DEC-007/Q3-deck.pptx');
    });
  });

  it('returns ok:false when origin file does not exist', async () => {
    await withTempVault(async (vault) => {
      const result = await appendExecutedBy(
        path.join(vault, 'decisions', 'NONEXISTENT.md'),
        'executions/DEC-999/artifact.docx',
        'run-test'
      );
      expect(result.updated).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  it('handles existing single-string executed_by (legacy format)', async () => {
    await withTempVault(async (vault) => {
      const decPath = path.join(vault, 'decisions', 'DEC-007.md');
      await fs.mkdir(path.dirname(decPath), { recursive: true });
      await fs.writeFile(decPath, makeDecisionFile('DEC-007', 'executions/DEC-007/old-artifact.docx'));

      const safeWriteMod = await import('../../../apps/utility/src/safewrite/index.js');
      let writtenContent = '';
      vi.spyOn(safeWriteMod, 'safeWrite').mockImplementation(async (args) => {
        writtenContent = args.content;
        return { ok: true, sha: 'sha' };
      });

      const result = await appendExecutedBy(decPath, 'executions/DEC-007/new-artifact.docx', 'run-test');
      expect(result.updated).toBe(true);
      // Both paths should be in the written content
      expect(writtenContent).toContain('old-artifact.docx');
      expect(writtenContent).toContain('new-artifact.docx');
    });
  });

  it('returns ok:false when safeWrite conflicts', async () => {
    await withTempVault(async (vault) => {
      const decPath = path.join(vault, 'decisions', 'DEC-007.md');
      await fs.mkdir(path.dirname(decPath), { recursive: true });
      await fs.writeFile(decPath, makeDecisionFile('DEC-007', null));

      const safeWriteMod = await import('../../../apps/utility/src/safewrite/index.js');
      vi.spyOn(safeWriteMod, 'safeWrite').mockResolvedValue({
        ok: false,
        conflict: true,
        sidecarPath: '/tmp/test.proposed.md',
      });

      const result = await appendExecutedBy(decPath, 'executions/DEC-007/artifact.docx', 'run-test');
      expect(result.updated).toBe(false);
    });
  });
});
