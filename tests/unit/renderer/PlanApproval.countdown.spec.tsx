// tests/unit/renderer/PlanApproval.countdown.spec.tsx
// Source: docs/decisions/0009-ch7-playbooks-home.md §12.4 + Phase R Decision 6
// Verifies the per-playbook auto-approve countdown.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PlanApproval, type Ch5RunPlan } from '../../../apps/renderer/src/screens/PlanApproval.js';

vi.mock('../../../apps/renderer/src/ipc-client.js', () => ({
  sendIpc: vi.fn(),
}));

afterEach(cleanup);

function makePlan(overrides: Partial<Ch5RunPlan> = {}): Ch5RunPlan {
  return {
    playbook: 'cash_lever',
    question: 'Test question',
    lenses: ['CFO', 'COS'],
    mcps: ['salesforce'],
    tokenEstimate: 1000,
    memoPath: '/vault/memos/test.md',
    degradations: [],
    ...overrides,
  };
}

describe('PlanApproval — countdown table (Phase R Decision 6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('cash_lever has no countdown (universal manual approval)', () => {
    render(<PlanApproval plan={makePlan({ playbook: 'cash_lever' })} />);
    expect(screen.queryByTestId('plan-countdown')).not.toBeInTheDocument();
  });

  it('strategic_option has no countdown (high-stakes)', () => {
    render(<PlanApproval plan={makePlan({ playbook: 'strategic_option' })} />);
    expect(screen.queryByTestId('plan-countdown')).not.toBeInTheDocument();
  });

  it('open_qa shows 10s countdown initially (ADR-0009 §12.4)', () => {
    render(<PlanApproval plan={makePlan({ playbook: 'open_qa' })} />);
    expect(screen.getByTestId('plan-countdown').textContent).toContain('10s');
  });

  it('gtm_realloc shows 30s countdown initially (Decision 6)', () => {
    render(<PlanApproval plan={makePlan({ playbook: 'gtm_realloc' })} />);
    expect(screen.getByTestId('plan-countdown').textContent).toContain('30s');
  });

  it('stakeholder_1_1 shows 5s countdown initially (pre-meeting)', () => {
    render(<PlanApproval plan={makePlan({ playbook: 'stakeholder_1_1' })} />);
    expect(screen.getByTestId('plan-countdown').textContent).toContain('5s');
  });

  it('pre_mortem shows 30s countdown initially', () => {
    render(<PlanApproval plan={makePlan({ playbook: 'pre_mortem' })} />);
    expect(screen.getByTestId('plan-countdown').textContent).toContain('30s');
  });

  it('countdown decrements every second', async () => {
    render(<PlanApproval plan={makePlan({ playbook: 'stakeholder_1_1' })} />);
    expect(screen.getByTestId('plan-countdown').textContent).toContain('5s');
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByTestId('plan-countdown').textContent).toContain('4s');
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByTestId('plan-countdown').textContent).toContain('3s');
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByTestId('plan-countdown').textContent).toContain('2s');
  });

  it('auto-approves when countdown reaches 0', async () => {
    const onApprove = vi.fn();
    render(<PlanApproval plan={makePlan({ playbook: 'stakeholder_1_1' })} onApprove={onApprove} />);
    expect(onApprove).not.toHaveBeenCalled();
    for (let i = 0; i < 6; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    }
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('Pause button stops the countdown', async () => {
    render(<PlanApproval plan={makePlan({ playbook: 'stakeholder_1_1' })} />);
    expect(screen.getByTestId('plan-countdown').textContent).toContain('5s');
    await act(async () => {
      screen.getByTestId('plan-pause-countdown-btn').click();
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.queryByTestId('plan-countdown')).not.toBeInTheDocument();
  });

  it('does not auto-approve when degradations contain a "block"', async () => {
    const onApprove = vi.fn();
    render(
      <PlanApproval
        plan={makePlan({
          playbook: 'open_qa',
          degradations: [{ source: 'salesforce', severity: 'block', message: 'auth expired' }],
        })}
        onApprove={onApprove}
      />
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(onApprove).not.toHaveBeenCalled();
  });
});
