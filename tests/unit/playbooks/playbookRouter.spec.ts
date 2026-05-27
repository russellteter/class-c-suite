// tests/unit/playbooks/playbookRouter.spec.ts
// Source: tasks/ch7-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §3.1 + §15 AC-1
// Tests routeToPlaybook(id) → module with runPlaybook function.
//
// NOTE: apps/utility/src/playbooks/lib/playbookRouter.ts does not exist yet
// (Runtime sub-agent scope). cash-lever/index.ts exports runCashLeverPlaybook
// (not the generic runPlaybook shape — adapter may be needed).
// All cases are it.todo until the router file ships.
// DO NOT import the missing module — vitest load-time error would break the suite.

import { describe, it } from 'vitest';

describe('playbookRouter — routeToPlaybook returns module with runPlaybook (ADR §3.1, AC-1)', () => {

  it.todo('routeToPlaybook("cash_lever") returns an object with runPlaybook function');
  it.todo('routeToPlaybook("gtm_realloc") returns an object with runPlaybook function');
  it.todo('routeToPlaybook("strategic_option") returns an object with runPlaybook function');
  it.todo('routeToPlaybook("stakeholder_1_1") returns an object with runPlaybook function');
  it.todo('routeToPlaybook("board_narrative") returns an object with runPlaybook function');
  it.todo('routeToPlaybook("restructure_decision") returns an object with runPlaybook function');
  it.todo('routeToPlaybook("pre_mortem") returns an object with runPlaybook function');
  it.todo('routeToPlaybook("quick_read") returns an object with runPlaybook function');
  it.todo('routeToPlaybook("open_qa") returns an object with runPlaybook function');

});

describe('playbookRouter — cash_lever adapter (AC-1 explicit)', () => {

  it.todo('cash_lever adapter exports runPlaybook (wraps runCashLeverPlaybook)');

});

describe('playbookRouter — unknown id handling', () => {

  it.todo('unknown playbook id: behavior matches Runtime implementation (throws or returns null)');

});
