// apps/utility/src/orchestrator/run-plan-builder.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §3 + §7 Step 3
// AC-3: buildRunPlan() returns correct RunPlan for cash_lever + open_qa.

import { join } from 'path';
import { homedir } from 'os';
import type { PlaybookId } from './classify-playbook.js';

// ADR-0006 §3.3 — scheduler windowCap: 180_000 tokens
const SCHEDULER_WINDOW_CAP = 180_000;

// Vault path (UNKNOWN — ADR-0006 §9: exact path pending Russell confirmation via Day-Zero form)
// Defaulting to documented vault location; surface at first run if xlsx not found.
const VAULT_PATH =
  process.env.VAULT_PATH ??
  join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

/**
 * Ch.5 RunPlan shape — extends the shared-types RunPlan with Ch.5-specific fields.
 * The shared-types RunPlan (steps[] + autoApproveAfterMs) remains the persisted form;
 * this richer shape is the in-memory plan used during plan-approval and orchestration.
 */
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
 *
 * cash_lever: lenses=[CFO, COS], mcps=[salesforce, aws, netsuite, cash_model_xlsx]
 * open_qa:    lenses=heuristic from question content, stamp=AD-HOC
 *
 * Token estimates are conservative; the scheduler enforces the cap at dispatch time.
 *
 * Source: ADR-0006 §3 + §7 Step 3
 */
export function buildRunPlan(playbook: string, question: string): Ch5RunPlan {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  switch (playbook as PlaybookId) {
    case 'cash_lever': {
      // ADR-0006 §1.2: CFO + COS required; CEO/CRO/CPO optional per question framing
      const lenses = resolveCashLeverLenses(question);

      // ADR-0006 §1.3: all 4 MCP services for cash lever
      const mcps = ['salesforce', 'aws', 'netsuite', 'cash_model_xlsx'];

      // Conservative estimate: 4 lens invocations × ~18K each + overhead
      // Kept well below 180K to leave headroom for Red-Team/Steelman/Synthesizer/Verifier
      const tokenEstimate = Math.min(72_000, SCHEDULER_WINDOW_CAP);

      const slug = generateSlug(question);
      const memoPath = join(VAULT_PATH, 'memos', `${today}-cash-lever-${slug}.md`);

      return {
        playbook: 'cash_lever',
        question,
        lenses,
        mcps,
        tokenEstimate,
        memoPath,
        degradations: [],
      };
    }

    case 'stakeholder_1on1_prep': {
      // Ch.7 stub — minimal plan
      const tokenEstimate = Math.min(40_000, SCHEDULER_WINDOW_CAP);
      const slug = generateSlug(question);
      return {
        playbook: 'stakeholder_1on1_prep',
        question,
        lenses: ['CEO', 'COS'],
        mcps: ['salesforce'],
        tokenEstimate,
        memoPath: join(VAULT_PATH, 'memos', `${today}-stakeholder-prep-${slug}.md`),
        degradations: [],
      };
    }

    default: {
      // open_qa — ad-hoc decomposition; derive lenses from question content
      const adHocLenses = resolveAdHocLenses(question);
      const tokenEstimate = Math.min(30_000, SCHEDULER_WINDOW_CAP);
      const slug = generateSlug(question);
      return {
        playbook: 'open_qa',
        question,
        lenses: adHocLenses,
        mcps: [],
        tokenEstimate,
        memoPath: join(VAULT_PATH, 'memos', `${today}-open-qa-${slug}.md`),
        stamp: 'AD-HOC',
        degradations: [],
      };
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Resolve which lenses fire for a cash lever question.
 * ADR-0006 §1.2: CFO + COS are always required. Optional lenses fire on keyword match.
 */
function resolveCashLeverLenses(question: string): string[] {
  const lower = question.toLowerCase();
  const lenses: string[] = ['CFO', 'COS']; // always required

  // CEO fires if question asks "what should we do" or strategic framing
  if (lower.includes('what should we do') || lower.includes('strategic')) {
    lenses.push('CEO');
  }
  // CRO fires if question mentions revenue or pipeline
  if (lower.includes('revenue') || lower.includes('pipeline')) {
    lenses.push('CRO');
  }
  // CPO fires if question mentions product or delivery risk
  if (lower.includes('product') || lower.includes('delivery')) {
    lenses.push('CPO');
  }
  // CMO: skip in Ch.5 per ADR-0006 §1.2 (low marginal signal for cash-specific question)

  return lenses;
}

/**
 * Derive lenses for ad-hoc open_qa questions from keyword signals.
 * Returns at least one lens (default CEO for general strategic questions).
 */
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

  // Always include CEO for general strategic questions; ensure at least 1 lens
  if (lenses.length === 0) {
    lenses.push('CEO');
  }

  return lenses;
}

/**
 * Generate a 3-word kebab slug from the question for the memo file path.
 * Strips stop words and punctuation; takes first 3 significant words.
 */
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
