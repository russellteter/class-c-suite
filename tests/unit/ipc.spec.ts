/**
 * ADR-0001 §3 + §9 row 7 — Typed IPC discriminated union
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0001-ch0-foundations.md §3 + §9 row 7
 *
 * Spec ambiguity (logged per brief §"Any spec ambiguity"):
 *   Brief line 57 claims "22 IPC variants". ADR §3 defines exactly 21 `kind` literals.
 *   Grep on 2026-05-26: `grep "kind: z.literal" docs/decisions/0001-ch0-foundations.md | wc -l` = 21.
 *   Decision: test all 21 variants from the ADR (ADR is authoritative per brief line 13).
 *
 * Tests will fail until Runtime lands packages/shared-types/src/ipc.ts.
 * That is expected per brief line 124.
 */

import { describe, it, expect } from 'vitest';
import { validateIpc } from '@c-suite/shared-types/ipc';

// ── Helper payloads ──────────────────────────────────────────────────────────

// ADR §3 PlaybookId valid values
const PLAYBOOK = 'cash_lever';

// ADR §3 AgentRole valid values
const ROLE = 'CFO';

// ADR §3 McpService valid value
const SERVICE = 'salesforce';

// ADR §3 JobName valid value
const JOB = 'monday-tripwire';

const JOB_PAYLOAD = {
  jobName: JOB,
  jobId: 'job-001',
  firedAt: Date.now(),
};

// ── Per-variant: valid payload → parses; missing required field → throws ────

describe('IpcMessage — run.start (§3 variant 1)', () => {
  it('parses valid run.start payload', () => {
    const msg = validateIpc({
      kind: 'run.start',
      payload: { runId: 'run-001', playbook: PLAYBOOK, question: 'What is the W30 lever stack?' },
    });
    expect(msg.kind).toBe('run.start');
  });

  it('throws when question is missing', () => {
    expect(() => validateIpc({
      kind: 'run.start',
      payload: { runId: 'run-001', playbook: PLAYBOOK },
    })).toThrow();
  });
});

describe('IpcMessage — run.plan.ready (§3 variant 2)', () => {
  it('parses valid run.plan.ready payload', () => {
    const msg = validateIpc({
      kind: 'run.plan.ready',
      payload: { runId: 'run-001', planJson: '{}', autoApproveAfterMs: null },
    });
    expect(msg.kind).toBe('run.plan.ready');
  });

  it('throws when planJson is missing', () => {
    expect(() => validateIpc({
      kind: 'run.plan.ready',
      payload: { runId: 'run-001', autoApproveAfterMs: null },
    })).toThrow();
  });
});

describe('IpcMessage — run.plan.approved (§3 variant 3)', () => {
  it('parses valid run.plan.approved payload', () => {
    const msg = validateIpc({
      kind: 'run.plan.approved',
      payload: { runId: 'run-001' },
    });
    expect(msg.kind).toBe('run.plan.approved');
  });

  it('throws when runId is missing', () => {
    expect(() => validateIpc({
      kind: 'run.plan.approved',
      payload: {},
    })).toThrow();
  });
});

describe('IpcMessage — run.failed (§3 variant 4)', () => {
  it('parses valid run.failed payload', () => {
    const msg = validateIpc({
      kind: 'run.failed',
      payload: { runId: 'run-001', reason: 'verifier rejected', stage: 'verifier-input-contract' },
    });
    expect(msg.kind).toBe('run.failed');
  });

  it('throws when stage is missing', () => {
    expect(() => validateIpc({
      kind: 'run.failed',
      payload: { runId: 'run-001', reason: 'error' },
    })).toThrow();
  });
});

describe('IpcMessage — agent.start (§3 variant 5)', () => {
  it('parses valid agent.start payload', () => {
    const msg = validateIpc({
      kind: 'agent.start',
      payload: { runId: 'run-001', agentId: 'agent-001', role: ROLE },
    });
    expect(msg.kind).toBe('agent.start');
  });

  it('throws when role is not a valid AgentRole', () => {
    expect(() => validateIpc({
      kind: 'agent.start',
      payload: { runId: 'run-001', agentId: 'agent-001', role: 'INVALID_ROLE' },
    })).toThrow();
  });
});

describe('IpcMessage — agent.tool.pre (§3 variant 6)', () => {
  it('parses valid agent.tool.pre payload', () => {
    const msg = validateIpc({
      kind: 'agent.tool.pre',
      payload: { runId: 'run-001', agentId: 'agent-001', tool: 'salesforce.query', args: { soql: 'SELECT Id FROM Account' } },
    });
    expect(msg.kind).toBe('agent.tool.pre');
  });

  it('throws when tool is missing', () => {
    expect(() => validateIpc({
      kind: 'agent.tool.pre',
      payload: { runId: 'run-001', agentId: 'agent-001', args: {} },
    })).toThrow();
  });
});

describe('IpcMessage — agent.tool.post (§3 variant 7)', () => {
  it('parses valid agent.tool.post payload', () => {
    const msg = validateIpc({
      kind: 'agent.tool.post',
      payload: {
        runId: 'run-001',
        agentId: 'agent-001',
        tool: 'salesforce.query',
        result: [{ Id: '001' }],
        sourceId: 'src-001',
        callId: 'call-001',
      },
    });
    expect(msg.kind).toBe('agent.tool.post');
  });

  it('throws when callId is missing', () => {
    expect(() => validateIpc({
      kind: 'agent.tool.post',
      payload: {
        runId: 'run-001',
        agentId: 'agent-001',
        tool: 'salesforce.query',
        result: {},
        sourceId: 'src-001',
      },
    })).toThrow();
  });
});

describe('IpcMessage — agent.complete (§3 variant 8)', () => {
  it('parses valid agent.complete payload', () => {
    const msg = validateIpc({
      kind: 'agent.complete',
      payload: { runId: 'run-001', agentId: 'agent-001', role: ROLE, structuredOutput: { summary: 'done' } },
    });
    expect(msg.kind).toBe('agent.complete');
  });

  it('throws when structuredOutput is missing', () => {
    expect(() => validateIpc({
      kind: 'agent.complete',
      payload: { runId: 'run-001', agentId: 'agent-001', role: ROLE },
    })).toThrow();
  });
});

describe('IpcMessage — agent.heartbeat (§3 variant 9 — B34)', () => {
  it('parses valid agent.heartbeat payload', () => {
    const msg = validateIpc({
      kind: 'agent.heartbeat',
      payload: { runId: 'run-001', agentId: 'agent-001', tokensSoFar: 1500 },
    });
    expect(msg.kind).toBe('agent.heartbeat');
  });

  it('accepts optional messageSnippet ≤80 chars', () => {
    const msg = validateIpc({
      kind: 'agent.heartbeat',
      payload: {
        runId: 'run-001',
        agentId: 'agent-001',
        tokensSoFar: 2000,
        messageSnippet: 'Analyzing covenant ratios...',
      },
    });
    expect(msg.kind).toBe('agent.heartbeat');
  });

  it('throws when tokensSoFar is missing', () => {
    expect(() => validateIpc({
      kind: 'agent.heartbeat',
      payload: { runId: 'run-001', agentId: 'agent-001' },
    })).toThrow();
  });
});

describe('IpcMessage — synthesizer.draft (§3 variant 10)', () => {
  it('parses valid synthesizer.draft payload', () => {
    const msg = validateIpc({
      kind: 'synthesizer.draft',
      payload: {
        runId: 'run-001',
        memoMarkdown: '## Analysis\nW30 is addressable via BACA.',
        citations: [{ claimId: 'c1', sourceId: 's1', callId: 'call1' }],
      },
    });
    expect(msg.kind).toBe('synthesizer.draft');
  });

  it('throws when citations is missing', () => {
    expect(() => validateIpc({
      kind: 'synthesizer.draft',
      payload: { runId: 'run-001', memoMarkdown: 'text' },
    })).toThrow();
  });
});

describe('IpcMessage — verifier.score (§3 variant 11)', () => {
  it('parses valid verifier.score payload', () => {
    const msg = validateIpc({
      kind: 'verifier.score',
      payload: {
        runId: 'run-001',
        score: 82,
        breakdown: {
          claim_source: 90,
          coverage: 80,
          red_team: 75,
          calibration: 85,
          falsifier: 80,
        },
        failures: [],
      },
    });
    expect(msg.kind).toBe('verifier.score');
  });

  it('throws when score is out of range (> 100)', () => {
    expect(() => validateIpc({
      kind: 'verifier.score',
      payload: {
        runId: 'run-001',
        score: 101,
        breakdown: { claim_source: 100, coverage: 100, red_team: 100, calibration: 100, falsifier: 100 },
        failures: [],
      },
    })).toThrow();
  });
});

describe('IpcMessage — writeback.proposed (§3 variant 12)', () => {
  it('parses valid writeback.proposed payload', () => {
    const msg = validateIpc({
      kind: 'writeback.proposed',
      payload: {
        runId: 'run-001',
        writebackId: 'wb-001',
        artifactType: 'position',
        draftPath: 'positions/active/POS-NEW-draft.md',
      },
    });
    expect(msg.kind).toBe('writeback.proposed');
  });

  it('throws when draftPath is missing', () => {
    expect(() => validateIpc({
      kind: 'writeback.proposed',
      payload: { runId: 'run-001', writebackId: 'wb-001', artifactType: 'position' },
    })).toThrow();
  });
});

describe('IpcMessage — writeback.committed (§3 variant 13)', () => {
  it('parses valid writeback.committed payload', () => {
    const msg = validateIpc({
      kind: 'writeback.committed',
      payload: {
        runId: 'run-001',
        writebackId: 'wb-001',
        artifactPath: 'positions/active/POS-023.md',
        gitSha: 'abc1234def5678',
      },
    });
    expect(msg.kind).toBe('writeback.committed');
  });

  it('throws when gitSha is missing', () => {
    expect(() => validateIpc({
      kind: 'writeback.committed',
      payload: { runId: 'run-001', writebackId: 'wb-001', artifactPath: 'positions/active/POS-023.md' },
    })).toThrow();
  });
});

describe('IpcMessage — safewrite.conflict (§3 variant 14)', () => {
  it('parses valid safewrite.conflict payload', () => {
    const msg = validateIpc({
      kind: 'safewrite.conflict',
      payload: {
        path: 'positions/active/POS-001.md',
        sidecarPath: 'positions/active/POS-001.md.proposed-20260526T143500.md',
      },
    });
    expect(msg.kind).toBe('safewrite.conflict');
  });

  it('throws when sidecarPath is missing', () => {
    expect(() => validateIpc({
      kind: 'safewrite.conflict',
      payload: { path: 'positions/active/POS-001.md' },
    })).toThrow();
  });
});

describe('IpcMessage — scheduler.throttle (§3 variant 15)', () => {
  it('parses valid scheduler.throttle payload with retryAt as number', () => {
    const msg = validateIpc({
      kind: 'scheduler.throttle',
      payload: { reason: 'previous job still running', retryAt: Date.now() + 60000 },
    });
    expect(msg.kind).toBe('scheduler.throttle');
  });

  it('parses scheduler.throttle with retryAt null (degraded-sequential)', () => {
    const msg = validateIpc({
      kind: 'scheduler.throttle',
      payload: { reason: 'degraded', retryAt: null },
    });
    expect(msg.kind).toBe('scheduler.throttle');
  });

  it('throws when reason is missing', () => {
    expect(() => validateIpc({
      kind: 'scheduler.throttle',
      payload: { retryAt: null },
    })).toThrow();
  });
});

describe('IpcMessage — job.started (§3 variant 16)', () => {
  it('parses valid job.started payload', () => {
    const msg = validateIpc({ kind: 'job.started', payload: JOB_PAYLOAD });
    expect(msg.kind).toBe('job.started');
  });

  it('throws when jobName is invalid', () => {
    expect(() => validateIpc({
      kind: 'job.started',
      payload: { ...JOB_PAYLOAD, jobName: 'not-a-valid-job' },
    })).toThrow();
  });
});

describe('IpcMessage — job.finished (§3 variant 17)', () => {
  it('parses valid job.finished payload with status success', () => {
    const msg = validateIpc({
      kind: 'job.finished',
      payload: { ...JOB_PAYLOAD, status: 'success', finishedAt: Date.now() },
    });
    expect(msg.kind).toBe('job.finished');
  });

  it('parses job.finished with status degraded and degradedSources', () => {
    const msg = validateIpc({
      kind: 'job.finished',
      payload: {
        ...JOB_PAYLOAD,
        status: 'degraded',
        degradedSources: ['salesforce', 'netsuite'],
        finishedAt: Date.now(),
      },
    });
    expect(msg.kind).toBe('job.finished');
  });
});

describe('IpcMessage — job.failed (§3 variant 18)', () => {
  it('parses valid job.failed payload', () => {
    const msg = validateIpc({
      kind: 'job.failed',
      payload: { ...JOB_PAYLOAD, status: 'failed', errorMessage: 'NetSuite auth expired' },
    });
    expect(msg.kind).toBe('job.failed');
  });

  it('throws when jobId is missing', () => {
    expect(() => validateIpc({
      kind: 'job.failed',
      payload: { jobName: JOB, firedAt: Date.now() },
    })).toThrow();
  });
});

describe('IpcMessage — mcp.auth.expired (§3 variant 19)', () => {
  it('parses valid mcp.auth.expired payload', () => {
    const msg = validateIpc({
      kind: 'mcp.auth.expired',
      payload: { service: SERVICE },
    });
    expect(msg.kind).toBe('mcp.auth.expired');
  });

  it('throws when service is not a valid McpService', () => {
    expect(() => validateIpc({
      kind: 'mcp.auth.expired',
      payload: { service: 'not_a_service' },
    })).toThrow();
  });
});

describe('IpcMessage — vault.changed (§3 variant 20)', () => {
  it('parses valid vault.changed payload with changeType added', () => {
    const msg = validateIpc({
      kind: 'vault.changed',
      payload: { path: 'positions/active/POS-001.md', changeType: 'modified' },
    });
    expect(msg.kind).toBe('vault.changed');
  });

  it('throws when changeType is not added|modified|deleted', () => {
    expect(() => validateIpc({
      kind: 'vault.changed',
      payload: { path: 'positions/active/POS-001.md', changeType: 'created' },
    })).toThrow();
  });
});

describe('IpcMessage — cost.usage (§3 variant 21)', () => {
  it('parses valid cost.usage payload', () => {
    const msg = validateIpc({
      kind: 'cost.usage',
      payload: {
        runId: 'run-001',
        tokensIn: 50000,
        tokensOut: 10000,
        windowRemainingTokens: 940000,
        windowResetsAt: Date.now() + 3600000,
      },
    });
    expect(msg.kind).toBe('cost.usage');
  });

  it('parses cost.usage without optional runId or jobId', () => {
    const msg = validateIpc({
      kind: 'cost.usage',
      payload: {
        tokensIn: 50000,
        tokensOut: 10000,
        windowRemainingTokens: 940000,
        windowResetsAt: Date.now() + 3600000,
      },
    });
    expect(msg.kind).toBe('cost.usage');
  });

  it('throws when windowRemainingTokens is missing', () => {
    expect(() => validateIpc({
      kind: 'cost.usage',
      payload: { tokensIn: 100, tokensOut: 50, windowResetsAt: Date.now() },
    })).toThrow();
  });
});

// ── vault.init.error (ADR-0003 §10 G-1 — new variant, not in Ch.0 union) ────
//
// Shape decision: payload: { message: string, vaultPath?: string }
// This matches the structural convention of every other IpcMessage variant
// (payload object, never top-level fields). ADR §7.2 shows { kind, message }
// at the top level — that is inconsistent with the union; this spec normalizes
// it to { kind, payload: { message, vaultPath? } }.
// The IpcMessage union in packages/shared-types/src/ipc.ts must be extended
// with this variant by Runtime (Ch.2) before these tests can pass (G-1).

describe('IpcMessage — vault.init.error (ADR-0003 §10 G-1)', () => {
  it('parses valid vault.init.error payload', () => {
    const msg = validateIpc({
      kind: 'vault.init.error',
      payload: {
        message: 'VaultNotInitialized',
        vaultPath: '/Users/test/vault',
      },
    });
    expect(msg.kind).toBe('vault.init.error');
  });

  it('parses vault.init.error with message only (vaultPath optional)', () => {
    const msg = validateIpc({
      kind: 'vault.init.error',
      payload: { message: 'VaultNotInitialized' },
    });
    expect(msg.kind).toBe('vault.init.error');
  });

  it('throws when payload is missing entirely', () => {
    expect(() => validateIpc({
      kind: 'vault.init.error',
    })).toThrow();
  });

  it('throws when message field is absent (wrong payload shape)', () => {
    expect(() => validateIpc({
      kind: 'vault.init.error',
      payload: { vaultPath: '/Users/test/vault' },
    })).toThrow();
  });

  it('throws when message is not a string', () => {
    expect(() => validateIpc({
      kind: 'vault.init.error',
      payload: { message: 42 },
    })).toThrow();
  });
});

// ── Unknown kind rejection ───────────────────────────────────────────────────

describe('validateIpc — unknown kind rejection', () => {
  it('throws for a completely unknown kind', () => {
    expect(() => validateIpc({
      kind: 'not.a.real.kind',
      payload: {},
    })).toThrow();
  });

  it('throws for a payload with no kind field', () => {
    expect(() => validateIpc({ payload: { runId: 'run-001' } })).toThrow();
  });

  it('throws for null input', () => {
    expect(() => validateIpc(null)).toThrow();
  });
});
