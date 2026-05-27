// apps/utility/src/playbooks/lib/playbookRouter.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §2 (scope 2) + §3.1
//
// routeToPlaybook — static map from PlaybookId → PlaybookModule.
// Phase A: cash_lever (adapted), stakeholder_1_1, pre_mortem, quick_read, open_qa.
// Phase B stubs: gtm_realloc, strategic_option, board_narrative, restructure_decision
//   → throw with helpful message; TS exhaustiveness holds via never check.
//
// The router does NOT dispatch — it returns the module. Dispatch is the orchestrator's job.

import type { PlaybookId, PlaybookModule } from '@c-suite/shared-types/playbook';

// Phase A imports (lazily imported to avoid circular dependency at module init)
// Using dynamic-style type imports is not necessary here — static import is fine
// since all Phase A modules are in scope.

import * as cashLever from '../cash-lever/index.js';
import * as stakeholder11 from '../stakeholder-1-1/index.js';
import * as preMortem from '../pre-mortem/index.js';
import * as quickRead from '../quick-read/index.js';
import * as openQa from '../open-qa/index.js';

/**
 * Static router: maps PlaybookId → PlaybookModule (the object with runPlaybook).
 * Phase B playbooks throw an informative error until the Phase B runtime ships.
 */
export function routeToPlaybook(playbookId: PlaybookId): PlaybookModule {
  switch (playbookId) {
    case 'cash_lever':
      return cashLever;

    case 'stakeholder_1_1':
      return stakeholder11;

    case 'pre_mortem':
      return preMortem;

    case 'quick_read':
      return quickRead;

    case 'open_qa':
      return openQa;

    // Phase B — not yet implemented; stubs throw so the router surface is honest.
    case 'gtm_realloc':
    case 'strategic_option':
    case 'board_narrative':
    case 'restructure_decision':
      throw new Error(
        `routeToPlaybook: Phase B playbook '${playbookId}' is not yet implemented. ` +
        `Phase B dispatches after the Phase A intermediate audit per ADR-0009 §14.`,
      );

    default: {
      const _exhaustive: never = playbookId;
      throw new Error(`routeToPlaybook: unknown playbookId '${String(_exhaustive)}'`);
    }
  }
}
