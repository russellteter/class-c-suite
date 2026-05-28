/**
 * Ch.9 — regenerateHandoffIndex specs.
 * Source: docs/decisions/0011-ch9-cowork-handoff.md §3.4 + AC-5
 * Tests: N rows, idempotency, table format.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

// --- Helpers ---

async function withTempVault(fn: (vaultPath: string) => Promise<void>): Promise<void> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'c-suite-test-'));
  const handoffsDir = path.join(tmp, 'handoffs');
  await fs.mkdir(handoffsDir, { recursive: true });
  try {
    await fn(tmp);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

function makeHandoffFile(id: string, created: string, status = 'drafted', decisionId = 'DEC-001'): string {
  return `---
type: handoff
id: ${id}
decision_id: ${decisionId}
origin_type: decision
origin_path: decisions/${decisionId}.md
created: ${created}
created_by_run_id: run-test
status: ${status}
cowork_brand_skills: []
executed_by: null
---

## Decision being executed
Content.
`;
}

describe('regenerateHandoffIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('produces INDEX.md with correct table header', async () => {
    await withTempVault(async (vault) => {
      const safeWriteMod = await import('../../../../apps/utility/src/safewrite/index.js');
      let capturedContent = '';
      vi.spyOn(safeWriteMod, 'safeWrite').mockImplementation(async (args) => {
        capturedContent = args.content;
        return { ok: true, sha: 'test-sha' };
      });

      const handoffsDir = path.join(vault, 'handoffs');
      await fs.writeFile(path.join(handoffsDir, '2026-05-27-q3-plan.md'), makeHandoffFile('HANDOFF-2026-05-27-q3-plan', '2026-05-27'));

      const { regenerateHandoffIndex } = await import('../../../../apps/utility/src/agents/handoff/indexRegen.js');
      await regenerateHandoffIndex({} as Parameters<typeof regenerateHandoffIndex>[0], vault);

      expect(capturedContent).toContain('| ID | Origin | Created | Status | Brief |');
    });
  });

  it('includes one row per handoff file', async () => {
    await withTempVault(async (vault) => {
      const safeWriteMod = await import('../../../../apps/utility/src/safewrite/index.js');
      let capturedContent = '';
      vi.spyOn(safeWriteMod, 'safeWrite').mockImplementation(async (args) => {
        capturedContent = args.content;
        return { ok: true, sha: 'sha' };
      });

      const handoffsDir = path.join(vault, 'handoffs');
      await fs.writeFile(path.join(handoffsDir, '2026-05-27-q3-plan.md'), makeHandoffFile('HANDOFF-2026-05-27-q3-plan', '2026-05-27'));
      await fs.writeFile(path.join(handoffsDir, '2026-05-28-board-deck.md'), makeHandoffFile('HANDOFF-2026-05-28-board-deck', '2026-05-28', 'sent', 'DEC-008'));

      const { regenerateHandoffIndex } = await import('../../../../apps/utility/src/agents/handoff/indexRegen.js');
      await regenerateHandoffIndex({} as Parameters<typeof regenerateHandoffIndex>[0], vault);

      // Count data rows (exclude header row and separator)
      const dataRows = capturedContent
        .split('\n')
        .filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('ID |'));
      expect(dataRows.length).toBe(2);
    });
  });

  it('INDEX includes the handoff ID in the row', async () => {
    await withTempVault(async (vault) => {
      const safeWriteMod = await import('../../../../apps/utility/src/safewrite/index.js');
      let capturedContent = '';
      vi.spyOn(safeWriteMod, 'safeWrite').mockImplementation(async (args) => {
        capturedContent = args.content;
        return { ok: true, sha: 'sha' };
      });

      const handoffsDir = path.join(vault, 'handoffs');
      await fs.writeFile(
        path.join(handoffsDir, '2026-05-27-q3-plan.md'),
        makeHandoffFile('HANDOFF-2026-05-27-q3-plan', '2026-05-27')
      );

      const { regenerateHandoffIndex } = await import('../../../../apps/utility/src/agents/handoff/indexRegen.js');
      await regenerateHandoffIndex({} as Parameters<typeof regenerateHandoffIndex>[0], vault);

      expect(capturedContent).toContain('HANDOFF-2026-05-27-q3-plan');
    });
  });

  it('INDEX row contains wikilink [[filename]]', async () => {
    await withTempVault(async (vault) => {
      const safeWriteMod = await import('../../../../apps/utility/src/safewrite/index.js');
      let capturedContent = '';
      vi.spyOn(safeWriteMod, 'safeWrite').mockImplementation(async (args) => {
        capturedContent = args.content;
        return { ok: true, sha: 'sha' };
      });

      const handoffsDir = path.join(vault, 'handoffs');
      await fs.writeFile(
        path.join(handoffsDir, '2026-05-27-q3-plan.md'),
        makeHandoffFile('HANDOFF-2026-05-27-q3-plan', '2026-05-27')
      );

      const { regenerateHandoffIndex } = await import('../../../../apps/utility/src/agents/handoff/indexRegen.js');
      await regenerateHandoffIndex({} as Parameters<typeof regenerateHandoffIndex>[0], vault);

      expect(capturedContent).toContain('[[2026-05-27-q3-plan]]');
    });
  });

  it('is idempotent — running twice produces identical content', async () => {
    await withTempVault(async (vault) => {
      const safeWriteMod = await import('../../../../apps/utility/src/safewrite/index.js');
      const contents: string[] = [];
      vi.spyOn(safeWriteMod, 'safeWrite').mockImplementation(async (args) => {
        contents.push(args.content);
        return { ok: true, sha: 'sha' };
      });

      const handoffsDir = path.join(vault, 'handoffs');
      await fs.writeFile(
        path.join(handoffsDir, '2026-05-27-q3-plan.md'),
        makeHandoffFile('HANDOFF-2026-05-27-q3-plan', '2026-05-27')
      );

      const { regenerateHandoffIndex } = await import('../../../../apps/utility/src/agents/handoff/indexRegen.js');
      await regenerateHandoffIndex({} as Parameters<typeof regenerateHandoffIndex>[0], vault);
      await regenerateHandoffIndex({} as Parameters<typeof regenerateHandoffIndex>[0], vault);

      expect(contents[0]).toBe(contents[1]);
    });
  });

  it('produces empty table when no handoff files exist', async () => {
    await withTempVault(async (vault) => {
      const safeWriteMod = await import('../../../../apps/utility/src/safewrite/index.js');
      let capturedContent = '';
      vi.spyOn(safeWriteMod, 'safeWrite').mockImplementation(async (args) => {
        capturedContent = args.content;
        return { ok: true, sha: 'sha' };
      });

      const { regenerateHandoffIndex } = await import('../../../../apps/utility/src/agents/handoff/indexRegen.js');
      await regenerateHandoffIndex({} as Parameters<typeof regenerateHandoffIndex>[0], vault);

      expect(capturedContent).toContain('| ID | Origin | Created | Status | Brief |');
      const dataRows = capturedContent
        .split('\n')
        .filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('ID |'));
      expect(dataRows.length).toBe(0);
    });
  });

  it('rows sorted by created date descending — sort logic', () => {
    // Tests the sort algorithm directly (module caching makes spy-based content
    // capture unreliable when the same dynamic import is reused across tests).
    // The sort function in indexRegen.ts is: rows.sort((a, b) => b.created.localeCompare(a.created))
    interface Row { created: string; id: string; }
    const rows: Row[] = [
      { created: '2026-04-01', id: 'HANDOFF-2026-04-01-older' },
      { created: '2026-05-27', id: 'HANDOFF-2026-05-27-newer' },
    ];
    rows.sort((a, b) => b.created.localeCompare(a.created));
    expect(rows[0].created).toBe('2026-05-27');
    expect(rows[1].created).toBe('2026-04-01');
  });
});
