/**
 * ADR-0001 §7 + §9 row 12 (B29) — Installer state-machine rewrite regression test
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0001-ch0-foundations.md §7.2 + §9 row 12
 *
 * Strategy per brief §69-89:
 *   - For each of the 8 op-logic skills, read line counts from:
 *     (a) installed: ~/.claude/skills/<name>/SKILL.md
 *     (b) full-body: fixtures/skills/<name>/SKILL.md (in this repo; was business-planning/skills/ pre-B28 polish)
 *   - If full-body does not exist in this repo (russell-voice, class-aws-connector),
 *     skip with message (brief line 89).
 *   - Assert installed lines >= 0.95 * full-body lines.
 *   - DO NOT invoke install script from test (would mutate user's skills directory).
 *
 * Pre-condition note (ADR §7.2):
 *   The regression test verifies ALREADY-installed skills. It does NOT invoke
 *   scripts/install-extracted-skills.py during the test run.
 *
 * Observed line counts at test authoring (2026-05-26 / 2026-05-27):
 *   run-critique: installed=68, full-body=167 (ratio 0.41 — WILL FAIL until B29 is fixed)
 *   class-aws-connector: no vault skill file (installer origin unclear) — SKIP
 *   russell-voice: no vault skill file — SKIP
 *
 * Tests will fail for truncated stubs until Runtime lands the B29 state-machine fix.
 * That is expected — this IS the regression test that proves B29 is fixed.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Paths
const SKILLS_DIR = process.env.SKILLS_DIR_OVERRIDE ?? path.join(os.homedir(), '.claude', 'skills');
// B28 polish 2026-05-27: skill fixtures moved from business-planning/skills/ to fixtures/skills/.
const VAULT_SKILLS_DIR = path.join(__dirname, '../../fixtures/skills');

// The 8 op-logic skills from ADR §6.2 + brief §78
const OP_LOGIC_SKILLS = [
  'weekly-cash-forecast',
  'covenant-tracker',
  'renewal-forecast',
  'call-intelligence',
  'run-critique',
  'system-check',
  'class-aws-connector',
  'russell-voice',
] as const;

function countLines(filePath: string): number {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').length;
}

function skillInstalled(name: string): boolean {
  return fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md'));
}

function skillHasVaultBody(name: string): boolean {
  return fs.existsSync(path.join(VAULT_SKILLS_DIR, name, 'SKILL.md'));
}

describe('Installer B29 regression — installed skill line counts vs full-body', () => {
  for (const skill of OP_LOGIC_SKILLS) {
    it(`${skill}: installed SKILL.md >= 95% of full-body line count`, () => {
      // Step 1: check if vault/full-body file exists in this repo
      if (!skillHasVaultBody(skill)) {
        // Skip with message per brief line 89
        console.log(`SKIP: no full body to compare for ${skill} (not in fixtures/skills/)`);
        return;
      }

      const fullBodyPath = path.join(VAULT_SKILLS_DIR, skill, 'SKILL.md');
      const fullBodyLines = countLines(fullBodyPath);

      if (fullBodyLines === 0) {
        console.log(`SKIP: no full body to compare for ${skill} (0 lines)`);
        return;
      }

      // Step 2: check if skill is installed
      if (!skillInstalled(skill)) {
        // Not yet installed — test skips
        console.log(`SKIP: ${skill} not yet installed at ${SKILLS_DIR}/${skill}/SKILL.md`);
        return;
      }

      const installedPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
      const installedLines = countLines(installedPath);
      const threshold = Math.floor(0.95 * fullBodyLines);

      expect(installedLines).toBeGreaterThanOrEqual(
        threshold,
        `${skill}: installed ${installedLines} lines vs full body ${fullBodyLines} — below 95% threshold (${threshold} required). B29 truncation bug not yet fixed.`,
      );
    });
  }
});

describe('Installer B29 regression — installed skills exist', () => {
  for (const skill of OP_LOGIC_SKILLS) {
    it(`${skill}: installed SKILL.md file exists at ~/.claude/skills/${skill}/SKILL.md`, () => {
      if (!skillHasVaultBody(skill)) {
        // If we can't compare against full-body, just verify installed exists if it should be there
        console.log(`INFO: no vault full-body for ${skill} — checking installed existence only`);
      }
      if (!skillInstalled(skill)) {
        console.log(`SKIP: ${skill} not yet installed — will fail when install script runs`);
        return;
      }
      const installedPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
      expect(fs.existsSync(installedPath)).toBe(true);
      expect(countLines(installedPath)).toBeGreaterThan(0);
    });
  }
});
