// apps/utility/src/agents/registry.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §2.13
import type { AgentRole, AgentDefinition } from '@c-suite/shared-types/agent-definition';
import {
  CEODefinition,
  CFODefinition,
  CRODefinition,
  CMODefinition,
  CPODefinition,
  COSDefinition,
  RedTeamDefinition,
  SteelmanDefinition,
  SynthesizerDefinition,
  VerifierDefinition,
  HandoffDefinition,
  RunCriticDefinition,
} from './index.js';

export const AGENT_REGISTRY: Record<AgentRole, AgentDefinition<unknown, unknown>> = {
  CEO:         CEODefinition as AgentDefinition<unknown, unknown>,
  CFO:         CFODefinition as AgentDefinition<unknown, unknown>,
  CRO:         CRODefinition as AgentDefinition<unknown, unknown>,
  CMO:         CMODefinition as AgentDefinition<unknown, unknown>,
  CPO:         CPODefinition as AgentDefinition<unknown, unknown>,
  COS:         COSDefinition as AgentDefinition<unknown, unknown>,
  RedTeam:     RedTeamDefinition as AgentDefinition<unknown, unknown>,
  Steelman:    SteelmanDefinition as AgentDefinition<unknown, unknown>,
  Synthesizer: SynthesizerDefinition as AgentDefinition<unknown, unknown>,
  Verifier:    VerifierDefinition as AgentDefinition<unknown, unknown>,
  Handoff:     HandoffDefinition as AgentDefinition<unknown, unknown>,
  RunCritic:   RunCriticDefinition as AgentDefinition<unknown, unknown>,
};
