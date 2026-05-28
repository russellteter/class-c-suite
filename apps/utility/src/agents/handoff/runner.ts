// apps/utility/src/agents/handoff/runner.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §4
// Orchestrates handoff brief generation: build prompt, invoke model, validate, return HandoffBrief.
// B3 invariant: NO lens reasoning traces reach the handoff prompt or output.

import * as path from 'path';
import * as os from 'os';
import { StubClaudeClient } from '@c-suite/stub-harness/stub';
import type { HandoffGeneratorInput, HandoffBrief } from '@c-suite/shared-types/handoff';
import { HandoffFrontmatter } from '@c-suite/shared-types/handoff';
import { slugify, existingSlugsFromDir } from './slug.js';
import { pickAllBrandSkills } from './skill-selector.js';
import { HANDOFF_SYSTEM_PROMPT } from './prompt.js';
import { createLogger } from '../../logger.js';

const log = createLogger();

const VAULT_PATH =
  process.env.VAULT_PATH ??
  path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

/**
 * Build the prompt context object passed to the model.
 * Critical: this object must NOT contain any lens outputs, red-team, steelman,
 * reasoning traces, or verifier data — B3 invariant.
 */
function buildPromptContext(input: HandoffGeneratorInput): Record<string, unknown> {
  // Explicitly whitelist fields — never spread the whole input or runContext
  return {
    // Origin artifact
    originType: input.origin.type,
    originId: input.origin.id,
    originPath: input.origin.path,
    originTitle: input.origin.title,
    originBodyMarkdown: input.origin.bodyMarkdown,
    originFrontmatter: input.origin.frontmatter,

    // Run context — only what the prompt actually uses
    runId: input.runContext.runId,
    playbookId: input.runContext.playbookId,
    stakeholdersOfInterest: input.runContext.stakeholdersOfInterest,
    workstreamsOfInterest: input.runContext.workstreamsOfInterest,
    memoMarkdown: input.runContext.memoMarkdown ?? null,

    // Available brand skills (informs deliverable section)
    availableBrandSkills: [
      'class-brand-document',
      'class-brand-excel',
      'class-brand-presentations',
      'class-ppt-cyan-light',
      'class-brand-voice',
    ],
    // NOTE: no lensOutputs, no redTeam, no steelman, no verifierOutput — B3
  };
}

/**
 * Extract a checklist from body markdown to guess deliverables for skill selection.
 * Parses `- [ ] ...` items.
 */
function extractDeliverables(bodyMarkdown: string): string[] {
  const lines = bodyMarkdown.split('\n');
  const deliverables: string[] = [];
  for (const line of lines) {
    const m = line.match(/^-\s+\[[ x]\]\s+(.+)$/i);
    if (m) deliverables.push(m[1].trim());
  }
  return deliverables;
}

/**
 * Generate a handoff brief from a HandoffGeneratorInput.
 * Uses StubClaudeClient (Opus tier in production, via STUB_MODE env).
 * B3: prompt context is whitelist-built — no lens traces included.
 */
export async function generateHandoffBrief(
  input: HandoffGeneratorInput,
  client?: StubClaudeClient,
): Promise<HandoffBrief> {
  log.info({ message: 'handoff.runner: generating brief', originId: input.origin.id, runId: input.runContext.runId });

  const systemPrompt = HANDOFF_SYSTEM_PROMPT;
  const promptContext = buildPromptContext(input);

  // Use provided client or fall back to stub from env
  const claudeClient = client ?? new StubClaudeClient('replay', 'tests/fixtures/stubs');

  // Invoke the model
  const agentDef = {
    role: 'Handoff',
    modelHint: 'claude-opus-4-7',  // Opus tier for production Chief of Staff
    systemPrompt,
  };

  const output = await claudeClient.invoke(agentDef, {
    question: `Produce the execution brief for: ${input.origin.title}`,
    ...promptContext,
  });

  // Extract body markdown from structured output
  const bodyMarkdown: string = typeof (output.structuredOutput as Record<string, unknown>)?.bodyMarkdown === 'string'
    ? (output.structuredOutput as Record<string, unknown>).bodyMarkdown as string
    : typeof output.structuredOutput === 'string'
      ? output.structuredOutput as string
      : JSON.stringify(output.structuredOutput);

  // Build frontmatter
  const today = new Date().toISOString().slice(0, 10);
  const handoffsDir = path.join(VAULT_PATH, 'handoffs');
  const existingSlugs = existingSlugsFromDir(handoffsDir);
  const slugToken = slugify(input.origin.title, existingSlugs);
  const filename = `${today}-${slugToken}.md`;
  const fullPath = path.join(handoffsDir, filename);
  const handoffId = `HANDOFF-${today}-${slugToken}`;

  // Derive brand skills from deliverables in the generated body
  const deliverables = extractDeliverables(bodyMarkdown);
  const brandSkills = pickAllBrandSkills(deliverables);

  // Build origin reference fields
  const originRefField =
    input.origin.type === 'decision' ? { decision_id: input.origin.id }
    : input.origin.type === 'memo' ? { memo_id: input.origin.id }
    : input.origin.type === 'position' ? { position_id: input.origin.id }
    : { pre_mortem_id: input.origin.id };

  const frontmatterRaw = {
    type: 'handoff' as const,
    id: handoffId,
    ...originRefField,
    origin_type: input.origin.type,
    origin_path: input.origin.path,
    created: today,
    created_by_run_id: input.runContext.runId,
    status: 'drafted' as const,
    cowork_brand_skills: brandSkills,
    executed_by: null,
  };

  // Validate frontmatter via Zod
  const frontmatter = HandoffFrontmatter.parse(frontmatterRaw);

  log.info({ message: 'handoff.runner: brief generated', handoffId, filename, brandSkills });

  return { frontmatter, bodyMarkdown, filename, fullPath };
}
