// apps/utility/src/playbooks/lib/evaluatePrereqs.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §3.6
//         docs/research/phase-r-decisions.md §Decision 4
//
// evaluatePrereqs — codifies the Decision 4 block/degrade/proceed matrix.
// Pure function. Lens isolation invariant: does NOT read lens outputs.
// Called by each playbook's runPlaybook before fan-out dispatch.

import type { PlaybookId, PlaybookDeps, PrereqDecision, DegradedSource } from '@c-suite/shared-types/playbook';

/**
 * Evaluate prerequisites for the given playbook and return a block/degrade/proceed decision.
 * Source: docs/research/phase-r-decisions.md §Decision 4 (verbatim table).
 *
 * Block rules (hard blocks — run does not proceed):
 *   cash_lever:           netsuite unavailable
 *   gtm_realloc:          salesforce auth expired
 *   strategic_option:     salesforce + aws + calibration (cash data) not ALL available
 *   board_narrative:      any of {salesforce, netsuite, powerbi, calibration} unavailable
 *   restructure_decision: salesforce + netsuite + calibration not ALL available
 *
 * Degrade rules (run proceeds with flags):
 *   cash_lever:           powerbi unavailable → degrade
 *   pre_mortem:           always proceed (no hard prereqs)
 *   quick_read:           proceed (stale MCPs flagged per lens, not here)
 *   stakeholder_1_1:      proceeds (skeleton path handled inside playbook)
 *   open_qa:              always proceed
 */
export function evaluatePrereqs(
  playbookId: PlaybookId,
  deps: PlaybookDeps,
): PrereqDecision {
  switch (playbookId) {
    case 'cash_lever': {
      if (!deps.netsuite) {
        return {
          kind: 'block',
          reason: 'NetSuite cash data unavailable',
          remediation: 'Reconnect NetSuite (Settings → Integrations) before running Cash Lever.',
        };
      }
      const flags: DegradedSource[] = [];
      if (!deps.powerbi) flags.push('powerbi');
      return flags.length ? { kind: 'degrade', flags } : { kind: 'proceed' };
    }

    case 'gtm_realloc': {
      if (!deps.salesforce) {
        return {
          kind: 'block',
          reason: 'Salesforce auth expired',
          remediation: 'Re-authorize Salesforce (Settings → Integrations) before running GTM Reallocation.',
        };
      }
      const flags: DegradedSource[] = [];
      if (!deps.netsuite) flags.push('netsuite');
      if (!deps.powerbi) flags.push('powerbi');
      if (!deps.gmail) flags.push('gmail');
      return flags.length ? { kind: 'degrade', flags } : { kind: 'proceed' };
    }

    case 'strategic_option': {
      const missing: DegradedSource[] = [];
      if (!deps.salesforce) missing.push('salesforce');
      if (!deps.aws) missing.push('aws');
      if (!deps.calibration) missing.push('calibration');
      if (missing.length > 0) {
        return {
          kind: 'block',
          reason: `Strategic Option requires Salesforce + AWS + calibration data. Missing: ${missing.join(', ')}.`,
          remediation: 'Connect all three sources in Settings → Integrations before running Strategic Option.',
        };
      }
      const flags: DegradedSource[] = [];
      if (!deps.netsuite) flags.push('netsuite');
      if (!deps.gmail) flags.push('gmail');
      if (!deps.powerbi) flags.push('powerbi');
      return flags.length ? { kind: 'degrade', flags } : { kind: 'proceed' };
    }

    case 'stakeholder_1_1': {
      // No hard blocks — missing stakeholder file handled inside the playbook via skeleton.
      const flags: DegradedSource[] = [];
      if (!deps.chorus) flags.push('chorus');
      if (!deps.gmail) flags.push('gmail');
      return flags.length ? { kind: 'degrade', flags } : { kind: 'proceed' };
    }

    case 'board_narrative': {
      const missing: DegradedSource[] = [];
      if (!deps.salesforce) missing.push('salesforce');
      if (!deps.netsuite) missing.push('netsuite');
      if (!deps.powerbi) missing.push('powerbi');
      if (!deps.calibration) missing.push('calibration');
      if (missing.length > 0) {
        return {
          kind: 'block',
          reason: `Board Narrative requires all of {Salesforce, NetSuite, PowerBI, calibration}. Missing: ${missing.join(', ')}.`,
          remediation: 'Connect all required sources in Settings → Integrations before running Board Narrative.',
        };
      }
      const flags: DegradedSource[] = [];
      if (!deps.aws) flags.push('aws');
      if (!deps.gmail) flags.push('gmail');
      if (!deps.chorus) flags.push('chorus');
      return flags.length ? { kind: 'degrade', flags } : { kind: 'proceed' };
    }

    case 'restructure_decision': {
      const missing: DegradedSource[] = [];
      if (!deps.salesforce) missing.push('salesforce');
      if (!deps.netsuite) missing.push('netsuite');
      if (!deps.calibration) missing.push('calibration');
      if (missing.length > 0) {
        return {
          kind: 'block',
          reason: `Restructure Decision requires Salesforce + NetSuite + cash model. Missing: ${missing.join(', ')}.`,
          remediation: 'Connect all required sources in Settings → Integrations before running Restructure Decision.',
        };
      }
      const flags: DegradedSource[] = [];
      if (!deps.gmail) flags.push('gmail');
      if (!deps.chorus) flags.push('chorus');
      if (!deps.powerbi) flags.push('powerbi');
      return flags.length ? { kind: 'degrade', flags } : { kind: 'proceed' };
    }

    case 'pre_mortem':
      // Adversarial-first; no required prereqs beyond the proposed-action description in input.
      // Source: docs/research/phase-r-decisions.md §Decision 4 row "Pre-mortem on proposed action"
      return { kind: 'proceed' };

    case 'quick_read':
      // Runs with stale MCPs flagged per-lens; no block at prereq level.
      // Source: docs/research/phase-r-decisions.md §Decision 4 row "Quick multi-lens read"
      return { kind: 'proceed' };

    case 'open_qa':
      // Ad-hoc decomposition; no structural prereqs.
      return { kind: 'proceed' };

    default: {
      // Exhaustiveness guard — Phase B playbooks not yet implemented.
      const _exhaustive: never = playbookId;
      throw new Error(`evaluatePrereqs: unknown playbookId ${String(_exhaustive)}`);
    }
  }
}
