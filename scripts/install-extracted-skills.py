#!/usr/bin/env python3
"""
One-shot installer for the extracted-skills file.

Walks the consolidated markdown at:
  ~/Documents/Claude/Projects/Business Planning/_extracted_skills_for_c_suite.md

For each `## N. <skill-name>` section:
  - Locates the FIRST fenced code block (the SKILL.md content).
  - Writes it to ~/.claude/skills/<skill-name>/SKILL.md.
  - For any subsequent fenced code block immediately following an
    "### Inlined reference: <filename>" heading, writes that content to
    ~/.claude/skills/<skill-name>/references/<filename>.
  - Records what got installed.

Reports a summary at the end. Non-destructive: skips installation if a
SKILL.md already exists at the target path (so existing skills like
class-brand-voice aren't clobbered).

Options:
  --force   Overwrite existing SKILL.md files (use after code-block extractor fix).
"""

from __future__ import annotations
import sys
from pathlib import Path

SRC = Path.home() / "Documents/Claude/Projects/Business Planning/_extracted_skills_for_c_suite.md"
SKILLS_DIR = Path.home() / ".claude" / "skills"

# Repo-local skill bodies (business-planning/skills/<name>/SKILL.md).
# When present, these are the canonical full-body source and are preferred
# over the extracted-skills markdown (which wraps content in fences that
# confuse the state-machine parser for skills with bare ``` inner blocks).
REPO_SKILLS_DIR = Path(__file__).parent.parent / "business-planning" / "skills"

FORCE = "--force" in sys.argv

if not SRC.exists():
    sys.exit(f"ERROR: source not found at {SRC}")

text = SRC.read_text(encoding="utf-8")

# Split into sections at "## N. skill-name" boundaries.
import re
section_re = re.compile(r"^## (\d+)\. ([a-z0-9-]+)\s*$", re.MULTILINE)
sections = []
for m in section_re.finditer(text):
    sections.append({
        "ordinal": int(m.group(1)),
        "name": m.group(2),
        "start": m.start(),
        "end": None,  # filled in below
    })
# Sort by start; assign end as the start of the next section (or end-of-file).
sections.sort(key=lambda s: s["start"])
for i, s in enumerate(sections):
    s["end"] = sections[i + 1]["start"] if i + 1 < len(sections) else len(text)

# Filter to only the 8 expected skill names.
EXPECTED = {
    "russell-voice", "run-critique", "weekly-cash-forecast",
    "covenant-tracker", "renewal-forecast", "call-intelligence",
    "system-check", "class-aws-connector",
}
skill_sections = [s for s in sections if s["name"] in EXPECTED]

if {s["name"] for s in skill_sections} != EXPECTED:
    missing = EXPECTED - {s["name"] for s in skill_sections}
    print(f"WARN: missing expected skill sections: {missing}")


def extract_skill_body_blocks(section_text: str) -> list[dict]:
    """
    Returns ordered list of {language: str|None, content: str, start_line: int}
    for every top-level fenced code block in section_text.

    ADR §7 state-machine specification. Replaces the non-greedy regex that
    stopped at the FIRST inner fence (B29 root cause, R2 §Area 8 lines 236-246).

    A "top-level" fence:
      - Starts with ``` at column 0 (no indentation).
      - Has an optional language tag immediately after the backticks.
      - Closes with ``` at column 0 on its own line (bare, no tag).

    Inner fences (any ``` line WITHIN an open top-level block) are tracked with
    depth counting: a language-tagged ``` increments depth; a bare ``` decrements
    depth. The top-level block closes only when depth returns to 0.

    This correctly handles SKILL.md bodies that contain embedded code examples
    (SQL, bash, etc.) as inner fences within the outer ```markdown wrapper.
    """
    OUTSIDE = "outside"
    INSIDE = "inside"

    state = OUTSIDE
    current_block: dict | None = None
    depth = 0
    blocks: list[dict] = []

    for line_num, line in enumerate(section_text.split('\n')):
        if state == OUTSIDE:
            if line.startswith('```'):
                # Opening fence. Capture language tag (may be empty).
                lang = line[3:].strip() or None
                current_block = {'language': lang, 'lines': [], 'start_line': line_num}
                state = INSIDE
                depth = 1
                continue
            # else: outside any block; ignore
        elif state == INSIDE:
            assert current_block is not None
            if line.startswith('```'):
                stripped = line.rstrip()
                if stripped == '```':
                    # Bare closer: decrement depth.
                    depth -= 1
                    if depth == 0:
                        # Top-level block closes.
                        current_block['content'] = '\n'.join(current_block['lines']) + '\n'
                        blocks.append(current_block)
                        current_block = None
                        state = OUTSIDE
                    else:
                        # Inner closer: treat as literal content.
                        current_block['lines'].append(line)
                else:
                    # Tagged opener inside an open block: increment depth + literal.
                    depth += 1
                    current_block['lines'].append(line)
            else:
                current_block['lines'].append(line)

    # Edge case: unclosed fence raises explicitly — do NOT silently truncate.
    if state == INSIDE:
        assert current_block is not None
        raise ValueError(
            f"unclosed code fence opened at line {current_block['start_line']} "
            f"(language: {current_block.get('language')})"
        )

    return blocks


# Reference-block detection: "### Inlined reference: <filename>" followed by
# a fenced code block.
ref_heading_re = re.compile(
    r"^### Inlined reference:\s*([\w./-]+)",
    re.MULTILINE,
)

results = []

for s in skill_sections:
    section_text = text[s["start"]:s["end"]]
    skill_name = s["name"]
    out_dir = SKILLS_DIR / skill_name
    skill_file = out_dir / "SKILL.md"
    refs_dir = out_dir / "references"

    if skill_file.exists() and not FORCE:
        results.append((skill_name, "SKIP", f"already installed at {skill_file} (use --force to overwrite)"))
        continue

    # Prefer repo-local full-body when available (avoids state-machine parse
    # ambiguity for skills that use bare ``` inner blocks inside markdown fences).
    repo_body = REPO_SKILLS_DIR / skill_name / "SKILL.md"
    if repo_body.exists():
        skill_content = repo_body.read_text(encoding="utf-8")
        was_present = skill_file.exists()
        out_dir.mkdir(parents=True, exist_ok=True)
        skill_file.write_text(skill_content, encoding="utf-8")
        action = "UPDATED" if was_present else "INSTALLED"
        results.append((
            skill_name,
            action,
            f"SKILL.md ({len(skill_content)} bytes) [from repo]",
        ))
        continue

    # Fallback: extract from state-machine parser (for skills without repo body).
    try:
        code_blocks = extract_skill_body_blocks(section_text)
    except ValueError as e:
        results.append((skill_name, "ERROR", f"parse error: {e}"))
        continue

    if not code_blocks:
        results.append((skill_name, "ERROR", "no code block found"))
        continue

    skill_content = code_blocks[0]['content'].rstrip() + "\n"

    out_dir.mkdir(parents=True, exist_ok=True)
    skill_file.write_text(skill_content, encoding="utf-8")
    installed_refs = []

    # For each "### Inlined reference: <fn>" heading, locate the next code
    # block AFTER the heading and within this section, and write it.
    # Build a mapping: block start_line -> block for lookup.
    ref_headings = list(ref_heading_re.finditer(section_text))
    section_lines = section_text.split('\n')

    for ref_h in ref_headings:
        ref_name = ref_h.group(1)
        # Strip any leading "references/" prefix.
        if ref_name.startswith("references/"):
            ref_name = ref_name[len("references/"):]
        # Find the heading's line number.
        ref_line_num = section_text[:ref_h.start()].count('\n')
        # Find the next code block after this heading's line.
        next_block = next(
            (b for b in code_blocks if b['start_line'] > ref_line_num),
            None,
        )
        if not next_block:
            continue
        ref_content = next_block['content'].rstrip() + "\n"
        refs_dir.mkdir(parents=True, exist_ok=True)
        (refs_dir / ref_name).write_text(ref_content, encoding="utf-8")
        installed_refs.append(ref_name)

    action = "UPDATED" if skill_file.exists() else "INSTALLED"
    results.append((
        skill_name,
        action,
        f"SKILL.md ({len(skill_content)} bytes)"
        + (f" + {len(installed_refs)} refs: {', '.join(installed_refs)}" if installed_refs else "")
    ))

# Report
print(f"\nProcessed {len(skill_sections)} skill sections from {SRC.name}\n")
for name, status, detail in results:
    marker = {"INSTALLED": "[OK]", "UPDATED": "[UP]", "SKIP": "[--]", "ERROR": "[!!]"}.get(status, "[??]")
    print(f"  {marker} {name:24s} {status:10s} {detail}")
print(f"\nInstall root: {SKILLS_DIR}")
