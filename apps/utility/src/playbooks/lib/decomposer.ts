// apps/utility/src/playbooks/lib/decomposer.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §12.2
//
// decompose — two-pass ad-hoc classifier for open_qa.
//   Pass 1: deterministic regex/keyword match → route to a specific playbook.
//   Pass 2: LLM (Opus) decomposition → dynamic lens + MCP + output-shape set.
//
// The deterministic patterns live inline here (documented per playbook).
// The LLM pass uses the StubClaudeClient in tests; real Opus client in production.
// Source: ADR-0009 §12.2

import type { DecompositionResult, PlaybookId } from '@c-suite/shared-types/playbook';
import type { StubClaudeClient } from '@c-suite/stub-harness/stub';
import { createLogger } from '../../logger.js';

const log = createLogger();

// ── ClaudeClient — structural duck-type (StubClaudeClient + future real client) ──

export type ClaudeClient = Pick<StubClaudeClient, 'invoke'>;

// ── Deterministic routing patterns ───────────────────────────────────────────
// Each entry: the playbook it routes to + the patterns that trigger the route.
// Priority: first match wins.

const DETERMINISTIC_ROUTES: Array<{ playbookId: PlaybookId; patterns: RegExp[] }> = [
  // cash_lever: cash, runway, liquidity, trough, burn rate
  {
    playbookId: 'cash_lever',
    patterns: [
      /\bcash\b/i,
      /\brunway\b/i,
      /\bliquidity\b/i,
      /\btrough\b/i,
      /\bburn\s*rate\b/i,
      /\bwhat\s+should\s+i\s+do\s+about\s+(the\s+)?cash\b/i,
    ],
  },
  // stakeholder_1_1: prep for 1:1, meeting prep with <name>, prepare for call
  {
    playbookId: 'stakeholder_1_1',
    patterns: [
      /\bprep\s+for\s+(my\s+)?1[:\-]?1\b/i,
      /\bprepare\s+for\s+(my\s+)?(1[:\-]?1|call|meeting)\s+with\b/i,
      /\bstakeholder\s+prep\b/i,
      /\b1[:\-]?1\s+prep\b/i,
    ],
  },
  // pre_mortem: what could go wrong, pre-mortem, failure modes, risks for
  {
    playbookId: 'pre_mortem',
    patterns: [
      /\bpre[\s-]?mortem\b/i,
      /\bwhat\s+could\s+go\s+wrong\b/i,
      /\bfailure\s+modes\b/i,
      /\bwhat\s+are\s+the\s+risks\s+(of|for)\b/i,
    ],
  },
  // quick_read: quick read, fast overview, six angles, quick take
  {
    playbookId: 'quick_read',
    patterns: [
      /\bquick\s+read\b/i,
      /\bfast\s+overview\b/i,
      /\bsix\s+angles\b/i,
      /\bquick\s+take\b/i,
    ],
  },
  // gtm_realloc: GTM, go-to-market realloc, sales/marketing headcount
  {
    playbookId: 'gtm_realloc',
    patterns: [
      /\bgtm\s+realloc/i,
      /\bgo[\s-]to[\s-]market\s+realloc/i,
      /\brealloc(at)?\s+(sales|marketing|gtm)\b/i,
    ],
  },
  // strategic_option: strategic option, evaluate option, recap, wind.?down, turnaround
  {
    playbookId: 'strategic_option',
    patterns: [
      /\bstrategic\s+option\b/i,
      /\bevaluate\s+(the\s+)?option\b/i,
      /\bwind[\s-]?down\b/i,
      /\bturnaround\s+option\b/i,
    ],
  },
  // board_narrative: board narrative, deck prep, board meeting
  {
    playbookId: 'board_narrative',
    patterns: [
      /\bboard\s+narrative\b/i,
      /\bdeck\s+prep\b/i,
      /\bboard\s+(meeting|prep|deck)\b/i,
    ],
  },
  // restructure_decision: fire, restructure, severance, let .* go
  {
    playbookId: 'restructure_decision',
    patterns: [
      /\brestructure\s+decision\b/i,
      /\bshould\s+i\s+(fire|let\s+go|terminate)\b/i,
      /\bseverance\b/i,
      /\bperformance\s+manage\b/i,
    ],
  },
];

/**
 * Deterministic first pass: check whether the prompt matches a known playbook trigger.
 * Returns the playbookId if matched, null otherwise.
 */
function deterministicRoute(prompt: string): PlaybookId | null {
  for (const route of DETERMINISTIC_ROUTES) {
    for (const pattern of route.patterns) {
      if (pattern.test(prompt)) {
        log.info({ message: `decomposer: deterministic route match`, playbookId: route.playbookId, pattern: pattern.source });
        return route.playbookId;
      }
    }
  }
  return null;
}

// ── LLM decomposer system prompt ─────────────────────────────────────────────

const DECOMPOSER_SYSTEM_PROMPT = `You are a classifier for a C-Suite AI assistant. Given an ad-hoc prompt from the CEO, determine:
1. Which of these lenses are relevant: CEO, CFO, CRO, CMO, CPO, COS (pick 1-6, order matters).
2. Which data sources are needed: salesforce, netsuite, aws, gmail, chorus, powerbi (pick 0-6).
3. The output shape: memo (narrative analysis), list (structured items), or table (structured data).

Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{"lenses":["CFO","COS"],"mcps":["salesforce","netsuite"],"outputShape":"memo"}

Rules:
- Financial questions → CFO first.
- Strategic questions → CEO + COS.
- Revenue/sales questions → CRO + CFO.
- Marketing questions → CMO.
- Product questions → CPO.
- People/process → COS.
- Include salesforce if the question involves pipeline, revenue, or customers.
- Include netsuite if the question involves financials, costs, or cash.
- Include gmail if the question involves communications or relationships.
- Default outputShape to "memo" unless the question clearly wants a list or table.`;

/**
 * LLM second pass via Opus. Returns the decomposed lens/MCP/shape set.
 * Falls back to a safe default if the LLM response is malformed.
 */
async function llmDecompose(
  prompt: string,
  client: ClaudeClient,
): Promise<{ lenses: string[]; mcps: string[]; outputShape: 'memo' | 'list' | 'table' }> {
  try {
    const result = await client.invoke(
      { role: 'Decomposer', systemPrompt: DECOMPOSER_SYSTEM_PROMPT },
      { question: prompt },
    );

    const raw = typeof result.structuredOutput === 'string'
      ? result.structuredOutput
      : JSON.stringify(result.structuredOutput);

    const parsed = JSON.parse(raw) as { lenses?: unknown; mcps?: unknown; outputShape?: unknown };
    const lenses = Array.isArray(parsed.lenses) ? (parsed.lenses as string[]) : ['CEO', 'CFO', 'COS'];
    const mcps = Array.isArray(parsed.mcps) ? (parsed.mcps as string[]) : [];
    const outputShape = ['memo', 'list', 'table'].includes(parsed.outputShape as string)
      ? (parsed.outputShape as 'memo' | 'list' | 'table')
      : 'memo';

    return { lenses, mcps, outputShape };
  } catch (err) {
    log.warn({ message: 'decomposer: LLM pass failed, using safe default', err: String(err) });
    // Safe fallback: COS + CFO, no MCPs, memo output.
    return { lenses: ['COS', 'CFO'], mcps: [], outputShape: 'memo' };
  }
}

/**
 * Two-pass decomposer for open_qa.
 * ADR-0009 §12.2: deterministic first, LLM second.
 *
 * @param prompt    The user's ad-hoc prompt.
 * @param fastClient  Claude client (Opus-class in production, StubClaudeClient in tests).
 */
export async function decompose(
  prompt: string,
  fastClient: ClaudeClient,
): Promise<DecompositionResult> {
  // Pass 1: deterministic
  const matched = deterministicRoute(prompt);
  if (matched) {
    return { kind: 'route_to_playbook', playbookId: matched };
  }

  // Pass 2: LLM
  log.info({ message: 'decomposer: no deterministic match, invoking LLM decomposer' });
  const { lenses, mcps, outputShape } = await llmDecompose(prompt, fastClient);

  return {
    kind: 'ad_hoc',
    lenses: lenses as Array<'CEO' | 'CFO' | 'CRO' | 'CMO' | 'CPO' | 'COS'>,
    mcps: mcps as Array<'salesforce' | 'netsuite' | 'aws' | 'gmail' | 'chorus' | 'powerbi'>,
    outputShape,
  };
}
