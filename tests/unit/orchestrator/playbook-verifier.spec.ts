// tests/unit/orchestrator/playbook-verifier.spec.ts
// B47 Phase 2 (audit Finding 2): the real Verifier scores the Ch.7 early-return
// playbooks in run-loop, replacing the hardcoded rigorScore the playbooks used to
// fabricate. These tests pin the adapter, the live-vs-replay asymmetry, the cap,
// and the ship-stamp recomputation.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildPlaybookVerifierInput,
  scorePlaybookRigor,
  applyShipStamp,
  REPLAY_FALLBACK_RIGOR,
} from '../../../apps/utility/src/orchestrator/playbookVerifier.js';
import type { PlaybookResult } from '../../../packages/shared-types/src/playbook.js';

// Minimal fake DB whose tool_calls query returns no rows (the common early-return case).
const fakeDb = {
  prepare() {
    return { all: () => [], get: () => undefined, run: () => undefined };
  },
} as unknown as import('better-sqlite3').Database;

function makeResult(over: Partial<PlaybookResult> = {}): PlaybookResult {
  return {
    memoMarkdown: '# Memo\n\nSome content.',
    degradedSources: [],
    lensOutputs: { RedTeam: { role: 'RedTeam' }, Steelman: { role: 'Steelman' }, CEO: { role: 'CEO' } },
    stamps: ['ADVERSARIAL_ONLY'],
    rigorScore: null,
    rigorThreshold: 70,
    proposedWritebacks: [],
    ...over,
  };
}

describe('buildPlaybookVerifierInput — adapter', () => {
  it('splits RedTeam/Steelman out of lensOutputs and keeps the rest as lens array', () => {
    const input = buildPlaybookVerifierInput(makeResult(), 'run-1', 'pre_mortem', 'Q?', fakeDb);
    expect(input.redTeamOutput).toEqual({ role: 'RedTeam' });
    expect(input.steelmanOutput).toEqual({ role: 'Steelman' });
    expect(input.lensOutputs).toEqual([{ role: 'CEO' }]);
    expect(input.positionMetadata).toEqual([]);
    expect(input.runPlaybook).toBe('pre_mortem');
    expect(input.runQuestion).toBe('Q?');
  });

  it('never emits an empty memoMarkdown (VerifierInput requires min 1 char)', () => {
    const input = buildPlaybookVerifierInput(makeResult({ memoMarkdown: '' }), 'r', 'pre_mortem', 'q', fakeDb);
    expect(input.memoMarkdown.length).toBeGreaterThan(0);
  });
});

describe('scorePlaybookRigor — replay fallback (no fixture)', () => {
  const ORIG = { ...process.env };
  beforeEach(() => {
    delete process.env.STUB_MODE; // defaults to replay
  });
  afterEach(() => {
    process.env = { ...ORIG };
  });

  it('falls back to the labelled constant when no Verifier fixture exists', async () => {
    const rigor = await scorePlaybookRigor(makeResult(), 'run-x', 'pre_mortem', 'q', fakeDb, '/nonexistent');
    expect(rigor.fellBack).toBe(true);
    expect(rigor.rigorScore).toBe(REPLAY_FALLBACK_RIGOR.pre_mortem); // 72
  });

  it('applies the open_qa 85 cap to the fallback raw score (88 → 85)', async () => {
    const rigor = await scorePlaybookRigor(makeResult(), 'run-x', 'open_qa', 'q', fakeDb, '/nonexistent');
    expect(rigor.rigorRawScore).toBe(88);
    expect(rigor.rigorScore).toBe(85);
  });
});

describe('scorePlaybookRigor — live mode fails loud', () => {
  const ORIG = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIG };
  });

  it('rethrows (never fabricates) when STUB_MODE=live and the Verifier cannot run', async () => {
    process.env.STUB_MODE = 'live';
    // RealClaudeClient with no CLAUDE_CODE_OAUTH_TOKEN / network will throw — the
    // point is that the failure propagates rather than silently returning a number.
    await expect(
      scorePlaybookRigor(makeResult(), 'run-x', 'pre_mortem', 'q', fakeDb, '/nonexistent'),
    ).rejects.toBeTruthy();
  });
});

describe('applyShipStamp — recompute CLEAN/DRAFT from the real score', () => {
  it('adds CLEAN when score >= threshold, preserving other stamps', () => {
    const stamps = applyShipStamp(['ADVERSARIAL_ONLY'], 90, 'pre_mortem'); // threshold 70
    expect(stamps).toContain('ADVERSARIAL_ONLY');
    expect(stamps).toContain('CLEAN');
    expect(stamps).not.toContain('DRAFT');
  });

  it('adds DRAFT when score < threshold', () => {
    const stamps = applyShipStamp(['DEGRADED'], 50, 'strategic_option'); // threshold 80
    expect(stamps).toContain('DEGRADED');
    expect(stamps).toContain('DRAFT');
  });

  it('replaces a stale CLEAN/DRAFT rather than duplicating', () => {
    const stamps = applyShipStamp(['DRAFT'], 90, 'pre_mortem');
    expect(stamps.filter((s) => s === 'CLEAN' || s === 'DRAFT')).toEqual(['CLEAN']);
  });

  it('leaves open_qa / quick_read stamps untouched (no CLEAN/DRAFT)', () => {
    expect(applyShipStamp(['DECOMPOSED_AD_HOC'], 50, 'open_qa')).toEqual(['DECOMPOSED_AD_HOC']);
    expect(applyShipStamp(['QUICK_READ'], 50, 'quick_read')).toEqual(['QUICK_READ']);
  });
});
