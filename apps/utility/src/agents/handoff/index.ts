// apps/utility/src/agents/handoff/index.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §4.1
// Public entry point for the handoff agent module.
// Exports the primary generator function + supporting utilities.

export { generateHandoffBrief } from './runner.js';
export { writeHandoffBrief, serializeHandoffFile } from './writer.js';
export { regenerateHandoffIndex } from './indexRegen.js';
export { slugify, slugifyTitle, existingSlugsFromDir } from './slug.js';
export { pickBrandSkills, pickAllBrandSkills, includesCyanLightVariant } from './skill-selector.js';
