// apps/utility/src/agents/index.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §2
// 12 AgentDefinitions: skeletons with stub systemPrompts (Ch.4 fills in prompts + rigor).
import { z } from 'zod';
import type { AgentDefinition, ZodLike } from '@c-suite/shared-types/agent-definition';
import type {
  LensOutput,
} from '@c-suite/shared-types/lens-output';
import {
  AgentRoleSchema,
  BaseLensOutputSchema,
  CFOOutputSchema,
  ContextDocumentSchema,
  CitationSchema,
  LensOutputSchema,
} from '@c-suite/shared-types/lens-output';
import {
  RedTeamOutputSchema,
  type RedTeamOutput,
} from '@c-suite/shared-types/red-team';
import {
  SteelmanOutputSchema,
  type SteelmanOutput,
} from '@c-suite/shared-types/steelman';
import { MemoSchema, type Memo } from '@c-suite/shared-types/memo';
import {
  VerifierInputSchema,
  type VerifierInput,
} from '@c-suite/shared-types/verifier-input';
import {
  RunCritiqueOutputSchema,
  type RunCritiqueOutput,
} from '@c-suite/shared-types/run-critique';

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const BaseInputSchema = z.object({
  runId: z.string(),
  question: z.string(),
  playbook: z.string(),
  contextDocuments: z.array(ContextDocumentSchema),
});

// ── 2.1 CEO ───────────────────────────────────────────────────────────────────

const CEOInputSchema = BaseInputSchema.extend({ role: z.literal('CEO') });
const CEOOutputSchema = BaseLensOutputSchema.extend({ role: z.literal('CEO') });
type CEOInput = z.infer<typeof CEOInputSchema>;
type CEOOutput = z.infer<typeof CEOOutputSchema>;

export const CEODefinition: AgentDefinition<CEOInput, CEOOutput> = {
  role: 'CEO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CEOInputSchema as ZodLike<CEOInput>,
  outputSchema: CEOOutputSchema as ZodLike<CEOOutput>,
  toolAllowlist: [],
  citationRequired: true,
};

// ── 2.2 CFO ───────────────────────────────────────────────────────────────────

const CFOInputSchema = BaseInputSchema.extend({
  role: z.literal('CFO'),
  financialMetrics: z.record(z.string(), z.unknown()).optional(),
});
type CFOInput = z.infer<typeof CFOInputSchema>;
type CFOOutputType = z.infer<typeof CFOOutputSchema>;

export const CFODefinition: AgentDefinition<CFOInput, CFOOutputType> = {
  role: 'CFO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CFOInputSchema as ZodLike<CFOInput>,
  outputSchema: CFOOutputSchema as ZodLike<CFOOutputType>,
  toolAllowlist: [],
  citationRequired: true,
};

// ── 2.3 CRO ───────────────────────────────────────────────────────────────────

const CROInputSchema = BaseInputSchema.extend({ role: z.literal('CRO') });
const CROOutputSchema = BaseLensOutputSchema.extend({ role: z.literal('CRO') });
type CROInput = z.infer<typeof CROInputSchema>;
type CROOutput = z.infer<typeof CROOutputSchema>;

export const CRODefinition: AgentDefinition<CROInput, CROOutput> = {
  role: 'CRO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CROInputSchema as ZodLike<CROInput>,
  outputSchema: CROOutputSchema as ZodLike<CROOutput>,
  toolAllowlist: [],
  citationRequired: true,
};

// ── 2.4 CMO ───────────────────────────────────────────────────────────────────

const CMOInputSchema = BaseInputSchema.extend({ role: z.literal('CMO') });
const CMOOutputSchema = BaseLensOutputSchema.extend({ role: z.literal('CMO') });
type CMOInput = z.infer<typeof CMOInputSchema>;
type CMOOutput = z.infer<typeof CMOOutputSchema>;

export const CMODefinition: AgentDefinition<CMOInput, CMOOutput> = {
  role: 'CMO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CMOInputSchema as ZodLike<CMOInput>,
  outputSchema: CMOOutputSchema as ZodLike<CMOOutput>,
  toolAllowlist: [],
  citationRequired: true,
};

// ── 2.5 CPO ───────────────────────────────────────────────────────────────────

const CPOInputSchema = BaseInputSchema.extend({ role: z.literal('CPO') });
const CPOOutputSchema = BaseLensOutputSchema.extend({ role: z.literal('CPO') });
type CPOInput = z.infer<typeof CPOInputSchema>;
type CPOOutput = z.infer<typeof CPOOutputSchema>;

export const CPODefinition: AgentDefinition<CPOInput, CPOOutput> = {
  role: 'CPO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CPOInputSchema as ZodLike<CPOInput>,
  outputSchema: CPOOutputSchema as ZodLike<CPOOutput>,
  toolAllowlist: [],
  citationRequired: true,
};

// ── 2.6 COS ───────────────────────────────────────────────────────────────────

const COSInputSchema = BaseInputSchema.extend({ role: z.literal('COS') });
const COSOutputSchema = BaseLensOutputSchema.extend({ role: z.literal('COS') });
type COSInput = z.infer<typeof COSInputSchema>;
type COSOutput = z.infer<typeof COSOutputSchema>;

export const COSDefinition: AgentDefinition<COSInput, COSOutput> = {
  role: 'COS',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: COSInputSchema as ZodLike<COSInput>,
  outputSchema: COSOutputSchema as ZodLike<COSOutput>,
  toolAllowlist: [],
  citationRequired: true,
};

// ── 2.7 RedTeam ───────────────────────────────────────────────────────────────

const RedTeamInputSchema = z.object({
  runId: z.string(),
  role: z.literal('RedTeam'),
  question: z.string(),
  lensOutputs: z.array(LensOutputSchema),
  memo: MemoSchema,
});
type RedTeamInput = z.infer<typeof RedTeamInputSchema>;

export const RedTeamDefinition: AgentDefinition<RedTeamInput, RedTeamOutput> = {
  role: 'RedTeam',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: RedTeamInputSchema as ZodLike<RedTeamInput>,
  outputSchema: RedTeamOutputSchema as ZodLike<RedTeamOutput>,
  toolAllowlist: [],
  citationRequired: false,
};

// ── 2.8 Steelman ──────────────────────────────────────────────────────────────

const SteelmanInputSchema = z.object({
  runId: z.string(),
  role: z.literal('Steelman'),
  question: z.string(),
  lensOutputs: z.array(LensOutputSchema),
  redTeamOutput: RedTeamOutputSchema,
});
type SteelmanInput = z.infer<typeof SteelmanInputSchema>;

export const SteelmanDefinition: AgentDefinition<SteelmanInput, SteelmanOutput> = {
  role: 'Steelman',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: SteelmanInputSchema as ZodLike<SteelmanInput>,
  outputSchema: SteelmanOutputSchema as ZodLike<SteelmanOutput>,
  toolAllowlist: [],
  citationRequired: false,
};

// ── 2.9 Synthesizer ───────────────────────────────────────────────────────────

const SynthesizerInputSchema = z.object({
  runId: z.string(),
  role: z.literal('Synthesizer'),
  question: z.string(),
  playbook: z.string(),
  lensOutputs: z.array(LensOutputSchema),
  redTeam: RedTeamOutputSchema,
  steelman: SteelmanOutputSchema,
});

const SynthesizerOutputSchema = z.object({
  role: z.literal('Synthesizer'),
  runId: z.string(),
  memoMarkdown: z.string().min(100),
  executiveSummary: z.string().min(50),
  keyDecisions: z.array(z.string()).min(1),
  citations: z.array(CitationSchema).min(1),
  positionMetadata: z.array(z.object({
    positionId: z.string(),
    role: AgentRoleSchema,
    claim: z.string(),
    isQuantitative: z.boolean(),
    namedEntity: z.string().optional(),
    citations: z.array(CitationSchema),
    sourceText: z.string(),
  })),
});

type SynthesizerInput = z.infer<typeof SynthesizerInputSchema>;
type SynthesizerOutput = z.infer<typeof SynthesizerOutputSchema>;

export const SynthesizerDefinition: AgentDefinition<SynthesizerInput, SynthesizerOutput> = {
  role: 'Synthesizer',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: SynthesizerInputSchema as ZodLike<SynthesizerInput>,
  outputSchema: SynthesizerOutputSchema as ZodLike<SynthesizerOutput>,
  toolAllowlist: [],
  citationRequired: true,
};

// ── 2.10 Verifier ─────────────────────────────────────────────────────────────

const VerifierOutputSchema = z.object({
  role: z.literal('Verifier'),
  runId: z.string(),
  rigorScore: z.number().min(0).max(100),
  passed: z.boolean(),
  failureReasons: z.array(z.string()),
  citationAudit: z.array(z.object({
    citationId: z.string(),
    verdict: z.enum(['valid', 'unsupported', 'fabricated', 'ambiguous']),
    notes: z.string().optional(),
  })),
  quantitativeAudit: z.array(z.object({
    claim: z.string(),
    verdict: z.enum(['named-entity', 'quantified', 'vague', 'unsupported']),
  })),
  antiSycophancyFlags: z.array(z.string()),
});

type VerifierOutput = z.infer<typeof VerifierOutputSchema>;

export const VerifierDefinition: AgentDefinition<VerifierInput, VerifierOutput> = {
  role: 'Verifier',
  modelHint: 'claude-opus-4-7',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: VerifierInputSchema as ZodLike<VerifierInput>,
  outputSchema: VerifierOutputSchema as ZodLike<VerifierOutput>,
  toolAllowlist: [],   // Permanent: Verifier uses NO external tools
  citationRequired: true,
};

// ── 2.11 Handoff ──────────────────────────────────────────────────────────────

const HandoffInputSchema = z.object({
  runId: z.string(),
  role: z.literal('Handoff'),
  memo: MemoSchema,
  verifierOutput: VerifierOutputSchema,
  runCritique: RunCritiqueOutputSchema,
  targetPath: z.string(),
});

const HandoffOutputSchema = z.object({
  role: z.literal('Handoff'),
  runId: z.string(),
  handoffMarkdown: z.string().min(100),
  handoffPath: z.string(),
});

type HandoffInput = z.infer<typeof HandoffInputSchema>;
type HandoffOutput = z.infer<typeof HandoffOutputSchema>;

export const HandoffDefinition: AgentDefinition<HandoffInput, HandoffOutput> = {
  role: 'Handoff',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: HandoffInputSchema as ZodLike<HandoffInput>,
  outputSchema: HandoffOutputSchema as ZodLike<HandoffOutput>,
  toolAllowlist: [],
  citationRequired: false,
};

// ── 2.12 RunCritic ────────────────────────────────────────────────────────────

const RunCriticInputSchema = z.object({
  runId: z.string(),
  role: z.literal('RunCritic'),
  question: z.string(),
  allLensOutputs: z.array(LensOutputSchema),
  redTeam: RedTeamOutputSchema,
  steelman: SteelmanOutputSchema,
  verifierOutput: VerifierOutputSchema,
  finalMemo: MemoSchema,
});

type RunCriticInput = z.infer<typeof RunCriticInputSchema>;

export const RunCriticDefinition: AgentDefinition<RunCriticInput, RunCritiqueOutput> = {
  role: 'RunCritic',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: RunCriticInputSchema as ZodLike<RunCriticInput>,
  outputSchema: RunCritiqueOutputSchema as ZodLike<RunCritiqueOutput>,
  toolAllowlist: [],
  citationRequired: false,
};
