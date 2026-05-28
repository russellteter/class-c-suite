// tests/unit/orchestrator/stub-guard.spec.ts
// Source: docs/reviews/mock-reliance-audit-2026-05-28.md + B47.
// Verifies the live-mode stub-data guard and the anti-rot invariant that keeps
// each playbook's STUBBED_SOURCES honest (a "clean" playbook must contain no
// stub*Query calls and no hardcoded rigorScore placeholder in its body).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  guardStubbedSourcesLive,
  runPlaybookGuarded,
  StubbedSourceLiveError,
} from '../../../apps/utility/src/orchestrator/stubGuard.js';
import { routeToPlaybook } from '../../../apps/utility/src/playbooks/lib/playbookRouter.js';
import { PlaybookIdSchema } from '../../../packages/shared-types/src/playbook.js';
import type {
  PlaybookId,
  PlaybookModule,
  PlaybookResult,
  StubbedSource,
} from '../../../packages/shared-types/src/playbook.js';

const REPO_ROOT = join(__dirname, '..', '..', '..');

// PlaybookId → source file path (mirrors playbookRouter's static map).
const PLAYBOOK_FILES: Record<PlaybookId, string> = {
  cash_lever: 'apps/utility/src/playbooks/cash-lever/index.ts',
  stakeholder_1_1: 'apps/utility/src/playbooks/stakeholder-1-1/index.ts',
  pre_mortem: 'apps/utility/src/playbooks/pre-mortem/index.ts',
  quick_read: 'apps/utility/src/playbooks/quick-read/index.ts',
  open_qa: 'apps/utility/src/playbooks/open-qa/index.ts',
  gtm_realloc: 'apps/utility/src/playbooks/gtm-realloc/index.ts',
  strategic_option: 'apps/utility/src/playbooks/strategic-option/index.ts',
  board_narrative: 'apps/utility/src/playbooks/board-narrative/index.ts',
  restructure_decision: 'apps/utility/src/playbooks/restructure-decision/index.ts',
};

const ALL_IDS = PlaybookIdSchema.options as PlaybookId[];

function makeModule(stubbed: readonly StubbedSource[]): PlaybookModule {
  return {
    STUBBED_SOURCES: stubbed,
    async runPlaybook(): Promise<PlaybookResult> {
      return {
        memoMarkdown: 'ok',
        degradedSources: [],
        lensOutputs: {},
        stamps: ['CLEAN'],
        rigorScore: 90,
        rigorThreshold: 70,
        proposedWritebacks: [],
      };
    },
  };
}

describe('stub guard — live-mode behavior', () => {
  const ORIG = { ...process.env };
  beforeEach(() => {
    delete process.env.STUB_MODE;
    delete process.env.ALLOW_STUBBED_LIVE;
  });
  afterEach(() => {
    process.env = { ...ORIG };
  });

  it('is a no-op in replay mode even with stubbed sources', () => {
    process.env.STUB_MODE = 'replay';
    expect(guardStubbedSourcesLive('cash_lever', makeModule(['aws']))).toEqual([]);
  });

  it('is a no-op for a clean playbook in live mode', () => {
    process.env.STUB_MODE = 'live';
    expect(guardStubbedSourcesLive('quick_read', makeModule([]))).toEqual([]);
  });

  it('REFUSES a stubbed playbook in live mode (default)', () => {
    process.env.STUB_MODE = 'live';
    expect(() => guardStubbedSourcesLive('cash_lever', makeModule(['aws', 'netsuite']))).toThrow(
      StubbedSourceLiveError,
    );
  });

  it('downgrades to degraded_sources with ALLOW_STUBBED_LIVE=1', async () => {
    process.env.STUB_MODE = 'live';
    process.env.ALLOW_STUBBED_LIVE = '1';
    const result = await runPlaybookGuarded(
      makeModule(['aws']),
      'cash_lever',
      { playbookId: 'cash_lever', prompt: 'q' },
      {} as never,
    );
    expect(result.degradedSources).toContain('aws');
  });

  it('runPlaybookGuarded refuses (does not run) a stubbed playbook in live mode', async () => {
    process.env.STUB_MODE = 'live';
    let ran = false;
    const mod: PlaybookModule = {
      STUBBED_SOURCES: ['salesforce'],
      async runPlaybook() {
        ran = true;
        return makeModule([]).runPlaybook({} as never, {} as never);
      },
    };
    await expect(
      runPlaybookGuarded(mod, 'cash_lever', { playbookId: 'cash_lever', prompt: 'q' }, {} as never),
    ).rejects.toThrow(StubbedSourceLiveError);
    expect(ran).toBe(false);
  });
});

describe('registry integrity — every routed playbook declares STUBBED_SOURCES', () => {
  for (const id of ALL_IDS) {
    it(`${id} exports a STUBBED_SOURCES array`, () => {
      const mod = routeToPlaybook(id);
      expect(Array.isArray(mod.STUBBED_SOURCES)).toBe(true);
    });
  }
});

describe('anti-rot — a clean playbook must not contain stub fabrications', () => {
  for (const id of ALL_IDS) {
    it(`${id}: if STUBBED_SOURCES is empty, body has no stub*Query / hardcoded rigorScore`, () => {
      const mod = routeToPlaybook(id);
      const stubbed = mod.STUBBED_SOURCES ?? [];
      if (stubbed.length > 0) return; // only clean playbooks must be fabrication-free

      const body = readFileSync(join(REPO_ROOT, PLAYBOOK_FILES[id]), 'utf8');
      // Fabricated MCP data helpers.
      expect(body, `${id} declares clean but calls a stub*Query helper`).not.toMatch(
        /\bstub[A-Z]\w*Query\s*\(/,
      );
      // Hardcoded rigor score: `rigorScore = 72` / `rawScore = 88` literal numeric assignment.
      expect(body, `${id} declares clean but hardcodes a rigor score`).not.toMatch(
        /\b(?:rigorScore|rawScore)\s*=\s*\d+/,
      );
    });
  }
});

describe('dynamic-import path (mondayTripwire) sees STUBBED_SOURCES', () => {
  it('cash-lever exposes STUBBED_SOURCES through await import() — the tripwire mechanism', async () => {
    // mondayTripwire.ts loads cash-lever via `await import(CASH_LEVER_MODULE)`.
    // The guard reads module.STUBBED_SOURCES off that namespace; prove it is reachable.
    const mod = (await import(
      '../../../apps/utility/src/playbooks/cash-lever/index.js'
    )) as unknown as PlaybookModule;
    expect(mod.STUBBED_SOURCES).toBeDefined();
    expect(mod.STUBBED_SOURCES).toContain('netsuite');
  });
});

describe('anti-rot — cash_lever correctly declares its current fabrications', () => {
  it('lists every fabricated source while it still fabricates them', () => {
    const mod = routeToPlaybook('cash_lever');
    const stubbed = mod.STUBBED_SOURCES ?? [];
    const body = readFileSync(join(REPO_ROOT, PLAYBOOK_FILES.cash_lever), 'utf8');
    // If the body still defines a stub*Query helper, the corresponding source must
    // be declared. This catches "un-stubbed the registry but not the code" rot.
    const fabricates = /\bstub[A-Z]\w*Query\s*\(/.test(body);
    if (fabricates) {
      expect(stubbed.length).toBeGreaterThan(0);
    }
  });
});
