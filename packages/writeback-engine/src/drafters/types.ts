// packages/writeback-engine/src/drafters/types.ts
// Shared types for all per-artifact-type drafter modules.
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §3
// Note: SynthesizerProposedWriteback defined here (not in shared-types) to avoid
// writeback-engine importing from apps/utility. Match shape from ADR §3.

export interface SynthesizerProposedWriteback {
  artifactType: 'position' | 'decision' | 'prediction' | 'pre-mortem-update' | 'stakeholder-update' | 'workstream-advance';
  targetArtifactId: string | null;            // null = create new; existing ID = update
  proposedFrontmatterPatch: Record<string, unknown>;
  proposedBodyPatch: string;
  lensesContributing: string[];               // AgentRole names
  oneSentenceDescription: string;
}

export interface DraftContext {
  runId: string;
  vaultRoot: string;
  playbook: string;
}

export interface DraftResult {
  proposedBody: string;
  proposedFrontmatter: Record<string, unknown>;
  activePath: string;
  artifactId: string;
  isNew: boolean;
}
