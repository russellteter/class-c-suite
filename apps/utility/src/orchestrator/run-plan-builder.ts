// apps/utility/src/orchestrator/run-plan-builder.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §3 + §7 Step 3
// PRD §6 lens rosters for all 8 V1 playbooks.
// B37 fix (2026-05-27): stakeholder_1_1 is COS-only (single-agent fast lane).

import { join } from 'path';
import { homedir } from 'os';
import type { PlaybookId } from './classify-playbook.js';

// ADR-0006 §3.3 — scheduler windowCap: 180_000 tokens
const SCHEDULER_WINDOW_CAP = 180_000;

// Vault path (UNKNOWN — ADR-0006 §9: exact path pending Russell confirmation via Day-Zero form)
const VAULT_PATH =
  process.env.VAULT_PATH ??
  join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

export interface Ch5RunPlan {
  playbook: PlaybookId;
  question: string;
  /** C-suite lens roles to fire in fan-out */
  lenses: string[];
  /** MCP service IDs to call */
  mcps: string[];
  /** Token estimate — finite number ≤ 180_000 */
  tokenEstimate: number;
  /** Expected memo vault path */
  memoPath: string;
  /** AD-HOC stamp — present only for open_qa */
  stamp?: 'AD-HOC';
  /** Degradation warnings to surface on plan-approval screen */
  degradations: DegradationWarning[];
}

export interface DegradationWarning {
  source: 'aws' | 'netsuite' | 'salesforce' | 'cash_model';
  severity: 'block' | 'degrade';
  message: string;
}

/**
 * Build a RunPlan for the given playbook + question.
 * Lens rosters per PRD §6 (B36/B37 fix 2026-05-27).
 */
export function buildRunPlan(playbook: string, question: string): Ch5RunPlan {
  const today = new Date().toISOString().slice(0, 10);
  const slug = generateSlug(question);
  const memoPath = (kind: string) =>
    join(VAULT_PATH, 'memos', `${today}-${kind}-${slug}.md`);

  switch (playbook as PlaybookId) {
    case 'cash_lever': {
      // PRD §6 playbook 1: CFO + COS (CEO/CRO/CPO optional per question)
      return {
        playbook: 'cash_lever',
        question,
        lenses: resolveCashLeverLenses(question),
        mcps: ['salesforce', 'aws', 'netsuite', 'cash_model_xlsx'],
        tokenEstimate: Math.min(72_000, SCHEDULER_WINDOW_CAP),
        memoPath: memoPath('cash-lever'),
        degradations: [],
      };
    }

    case 'gtm_reallocation': {
      // PRD §6 playbook 2: CRO + CFO + CMO + CPO + COS
      return {
        playbook: 'gtm_reallocation',
        question,
        lenses: ['CRO', 'CFO', 'CMO', 'CPO', 'COS'],
        mcps: ['salesforce', 'netsuite'],
        tokenEstimate: Math.min(90_000, SCHEDULER_WINDOW_CAP),
        memoPath: memoPath('gtm-reallocation'),
        degradations: [],
      };
    }

    case 'strategic_option': {
      // PRD §6 playbook 3: CEO + CFO + CPO + COS (heavy red-team; threshold 80)
      return {
        playbook: 'strategic_option',
        question,
        lenses: ['CEO', 'CFO', 'CPO', 'COS'],
        mcps: ['salesforce', 'netsuite'],
        tokenEstimate: Math.min(80_000, SCHEDULER_WINDOW_CAP),
        memoPath: memoPath('strategic-option'),
        degradations: [],
      };
    }

    case 'stakeholder_1_1': {
      // PRD §6 playbook 4: Chief of Staff ONLY — single-agent fast lane.
      // B37 fix: was ['CEO','COS']; now ['COS'].
      return {
        playbook: 'stakeholder_1_1',
        question,
        lenses: ['COS'],
        mcps: ['salesforce'],
        tokenEstimate: Math.min(20_000, SCHEDULER_WINDOW_CAP),
        memoPath: memoPath('stakeholder-prep'),
        degradations: [],
      };
    }

    case 'board_narrative': {
      // PRD §6 playbook 5: all six lenses
      return {
        playbook: 'board_narrative',
        question,
        lenses: ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'],
        mcps: ['salesforce', 'netsuite', 'aws'],
        tokenEstimate: Math.min(108_000, SCHEDULER_WINDOW_CAP),
        memoPath: memoPath('board-narrative'),
        degradations: [],
      };
    }

    case 'restructure_decision': {
      // PRD §6 playbook 6: COS + CFO (+ CPO if person is product/eng/tech).
      // CPO added conditionally on keyword signal in the question.
      const lenses: string[] = ['COS', 'CFO'];
      if (questionMentionsProductOrEng(question)) {
        lenses.push('CPO');
      }
      return {
        playbook: 'restructure_decision',
        question,
        lenses,
        mcps: ['salesforce'],
        tokenEstimate: Math.min(60_000, SCHEDULER_WINDOW_CAP),
        memoPath: memoPath('restructure-decision'),
        degradations: [],
      };
    }

    case 'pre_mortem': {
      // PRD §6 playbook 7: adversarial-first — RedTeam + Steelman primary, lenses skipped.
      // run-plan persists empty lens list; state-machine routes through red-team-steelman.
      return {
        playbook: 'pre_mortem',
        question,
        lenses: [],
        mcps: [],
        tokenEstimate: Math.min(40_000, SCHEDULER_WINDOW_CAP),
        memoPath: memoPath('pre-mortem'),
        degradations: [],
      };
    }

    case 'quick_multi_lens': {
      // PRD §6 playbook 8: all six lenses, no red-team, no Verifier gate. "QUICK READ".
      // run-plan wires all six; state-machine handles the no-red-team/no-Verifier shortcuts.
      return {
        playbook: 'quick_multi_lens',
        question,
        lenses: ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'],
        mcps: [],
        tokenEstimate: Math.min(60_000, SCHEDULER_WINDOW_CAP),
        memoPath: memoPath('quick-multi-lens'),
        degradations: [],
      };
    }

    default: {
      // open_qa — ad-hoc decomposition; derive lenses from question content
      return {
        playbook: 'open_qa',
        question,
        lenses: resolveAdHocLenses(question),
        mcps: [],
        tokenEstimate: Math.min(30_000, SCHEDULER_WINDOW_CAP),
        memoPath: memoPath('open-qa'),
        stamp: 'AD-HOC',
        degradations: [],
      };
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Cash lever lens resolution per ADR-0006 §1.2.
 * CFO + COS always required. Optional lenses on keyword signal.
 */
function resolveCashLeverLenses(question: string): string[] {
  const lower = question.toLowerCase();
  const lenses: string[] = ['CFO', 'COS'];
  if (lower.includes('what should we do') || lower.includes('strategic')) {
    lenses.push('CEO');
  }
  if (lower.includes('revenue') || lower.includes('pipeline')) {
    lenses.push('CRO');
  }
  if (lower.includes('product') || lower.includes('delivery')) {
    lenses.push('CPO');
  }
  return lenses;
}

/**
 * Add CPO to restructure_decision when the question signals product/eng/technical role.
 * Per PRD §6 playbook 6.
 */
function questionMentionsProductOrEng(question: string): boolean {
  const lower = question.toLowerCase();
  return (
    lower.includes('product') ||
    lower.includes('engineer') ||
    lower.includes('eng ') ||
    lower.includes('cto') ||
    lower.includes('cpo') ||
    lower.includes('technical') ||
    lower.includes('developer') ||
    lower.includes('roadmap')
  );
}

function resolveAdHocLenses(question: string): string[] {
  const lower = question.toLowerCase();
  const lenses: string[] = [];

  if (lower.includes('revenue') || lower.includes('sales') || lower.includes('pipeline')) {
    lenses.push('CRO');
  }
  if (lower.includes('finance') || lower.includes('budget') || lower.includes('cost')) {
    lenses.push('CFO');
  }
  if (lower.includes('product') || lower.includes('engineering') || lower.includes('roadmap')) {
    lenses.push('CPO');
  }
  if (lower.includes('marketing') || lower.includes('brand') || lower.includes('campaign')) {
    lenses.push('CMO');
  }
  if (lower.includes('operations') || lower.includes('process') || lower.includes('execution')) {
    lenses.push('COS');
  }
  if (lenses.length === 0) {
    lenses.push('CEO');
  }
  return lenses;
}

function generateSlug(question: string): string {
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'we', 'our', 'should', 'be', 'is', 'are',
    'was', 'were', 'will', 'would', 'could', 'might', 'do', 'does', 'did',
    'have', 'has', 'had', 'it', 'its', 'this', 'that', 'these', 'those',
    'what', 'when', 'where', 'which', 'who', 'why', 'how', 'vs', 'vs.',
  ]);
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .slice(0, 3);
  return words.length > 0 ? words.join('-') : 'ad-hoc-query';
}
