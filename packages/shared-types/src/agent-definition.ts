// packages/shared-types/src/agent-definition.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §2.0

export type AgentRole =
  | 'CEO' | 'CFO' | 'CRO' | 'CMO' | 'CPO' | 'COS'
  | 'RedTeam' | 'Steelman' | 'Synthesizer' | 'Verifier'
  | 'Handoff' | 'RunCritic';

export type LensRole = 'CEO' | 'CFO' | 'CRO' | 'CMO' | 'CPO' | 'COS';

export const LENS_ROLES: readonly LensRole[] = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'];

// Structural duck-type for Zod schemas (Zod 4.x compatible — avoids ZodType<O,D,I> three-param class)
export interface ZodLike<T> {
  parse: (value: unknown) => T;
  safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: unknown };
}

export interface AgentDefinition<I, O> {
  role: AgentRole;
  modelHint: 'claude-sonnet-4-6' | 'claude-opus-4-7';
  systemPrompt: string;        // stub in Ch.3; full prompts in Ch.4
  inputSchema: ZodLike<I>;
  outputSchema: ZodLike<O>;
  toolAllowlist: string[];     // MCP tool IDs; placeholder in Ch.3
  citationRequired: boolean;
}
