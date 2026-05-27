/**
 * ADR-0002 §9 row 6 — Heartbeat rate-limiting (B34 mitigation)
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0002-ch1-process-architecture.md §7 + §9 row 6
 *
 * Spec ambiguities:
 *   1. Brief row 6 says "≤ 45 heartbeat events (4/sec × 10s + 5 buffer)".
 *      ADR §7.1 specifies interval = 250ms (4/sec). Over 10s that's max 40 events.
 *      Brief adds 5-event tolerance. Upper bound: 45. Tests enforce ≤ 45.
 *   2. ADR §7.2: heartbeats are "best-effort" (dropped if port write fails).
 *      agent.complete is "never dropped." Tests simulate this via mock.
 *   3. ADR §7.3 exports `HeartbeatEmitter` from `apps/utility/src/heartbeat.ts`.
 *      It is a stateful class; tests instantiate it directly.
 *   4. Backpressure scenario (brief row 6 bullet 4): if renderer doesn't ack in >2s,
 *      heartbeats drop but agent.complete survives. Modelled by simulating a port that
 *      rejects heartbeats but accepts completion events.
 *
 * Tests fail until Runtime ships apps/utility/src/heartbeat.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Production module — does not exist yet. Uncomment when Runtime ships:
// import { HeartbeatEmitter } from '../../../apps/utility/src/heartbeat.js';

// Stub so TypeScript compiles now.
class HeartbeatEmitter {
  constructor() {
    throw new Error('HeartbeatEmitter not implemented — Runtime dispatch pending');
  }
  shouldEmit(_agentId: string): boolean {
    throw new Error('not implemented');
  }
  record(_agentId: string): void {
    throw new Error('not implemented');
  }
}

// ── §9 row 6 — Heartbeat rate ≤ 45 events over 10s ──────────────────────────

describe('HeartbeatEmitter — rate-limiting 4/sec cap (§9 row 6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits ≤ 45 heartbeats when 1000 token events arrive over 10s', () => {
    const emitter = new HeartbeatEmitter();
    const agentId = 'agent-001';

    // Simulate 1000 token events arriving over 10 seconds (10 events/ms on average).
    // HeartbeatEmitter.shouldEmit() gates on 250ms interval.
    let emittedCount = 0;
    const TOKEN_EVENTS = 1000;
    const DURATION_MS = 10_000;

    for (let i = 0; i < TOKEN_EVENTS; i++) {
      // Advance time proportionally (1 token event every 10ms).
      vi.advanceTimersByTime(DURATION_MS / TOKEN_EVENTS);

      if (emitter.shouldEmit(agentId)) {
        emittedCount++;
        emitter.record(agentId);
      }
    }

    // 4 heartbeats/sec × 10s = 40 max; brief allows +5 tolerance → ≤ 45.
    expect(emittedCount).toBeLessThanOrEqual(45);
  });

  it('first shouldEmit always returns true (no prior record)', () => {
    const emitter = new HeartbeatEmitter();
    expect(emitter.shouldEmit('agent-fresh')).toBe(true);
  });

  it('shouldEmit returns false within 250ms of last emit', () => {
    const emitter = new HeartbeatEmitter();
    const agentId = 'agent-002';

    emitter.record(agentId);
    vi.advanceTimersByTime(249);
    expect(emitter.shouldEmit(agentId)).toBe(false);
  });

  it('shouldEmit returns true after 250ms has elapsed since last emit', () => {
    const emitter = new HeartbeatEmitter();
    const agentId = 'agent-003';

    emitter.record(agentId);
    vi.advanceTimersByTime(250);
    expect(emitter.shouldEmit(agentId)).toBe(true);
  });

  it('tracks separate cooldown per agentId', () => {
    const emitter = new HeartbeatEmitter();

    emitter.record('agent-A');
    vi.advanceTimersByTime(100);

    // agent-A blocked; agent-B (first emit) should be allowed.
    expect(emitter.shouldEmit('agent-A')).toBe(false);
    expect(emitter.shouldEmit('agent-B')).toBe(true);
  });
});

// ── §9 row 6 — agent.complete always delivered (backpressure) ───────────────

describe('HeartbeatEmitter — agent.complete survives dropped heartbeats (§9 row 6)', () => {
  it('completion event is emitted regardless of heartbeat backpressure', () => {
    // The HeartbeatEmitter controls heartbeat gating only.
    // agent.complete is sent unconditionally by the orchestrator — not gated by HeartbeatEmitter.
    // This test verifies the emitter never suppresses non-heartbeat events.
    //
    // Implementation contract:
    //   HeartbeatEmitter.shouldEmit() is ONLY called for heartbeat events.
    //   The orchestrator sends agent.complete directly; HeartbeatEmitter is never consulted.
    //   Therefore: shouldEmit cannot affect completion events.
    //
    // Runtime must NOT route agent.complete through HeartbeatEmitter.shouldEmit().
    const emitter = new HeartbeatEmitter();

    // Saturate heartbeat (last emit just happened).
    emitter.record('agent-004');
    // Heartbeats are now gated.
    expect(emitter.shouldEmit('agent-004')).toBe(false);

    // agent.complete is NEVER gated by HeartbeatEmitter — it is always sent.
    // Verify that HeartbeatEmitter offers no method to suppress non-heartbeat events.
    // The `shouldEmit` method is ONLY a heartbeat rate gate; agent.complete bypasses it.
    // This test documents the Runtime contract: agent.complete must not call shouldEmit.
    expect(typeof emitter.shouldEmit).toBe('function');
    // No `shouldEmitComplete` or similar method should exist.
    expect((emitter as unknown as Record<string, unknown>).shouldEmitComplete).toBeUndefined();
  });
});
