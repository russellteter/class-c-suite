#!/usr/bin/env python3
"""
One-shot installer for the extracted-skills file.

Walks the consolidated markdown at:
  ~/Documents/Claude/Projects/Business Planning/_extracted_skills_for_c_suite.md

For each `## N. <skill-name>` section:
  - Locates the FIRST ```markdown code block (the SKILL.md content).
  - Writes it to ~/.claude/skills/<skill-name>/SKILL.md.
  - For any subsequent ```markdown code block immediately following an
    "### Inlined reference: <filename>" heading, writes that content to
    ~/.claude/skills/<skill-name>/references/<filename>.
  - Records what got installed.

Reports a summary at the end. Non-destructive: skips installation if a
SKILL.md already exists at the target path (so existing skills like
class-brand-voice aren't clobbered).
"""

from __future__ import annotations
import re
import sys
from pathlib import Path

SRC = Path.home() / "Documents/Claude/Projects/Business Planning/_extracted_skills_for_c_suite.md"
SKILLS_DIR = Path.home() / ".claude" / "skills"

if not SRC.exists():
    sys.exit(f"ERROR: source not found at {SRC}")

text = SRC.read_text(encoding="utf-8")

# Split into sections at "## N. skill-name" boundaries.
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

# Filter to only the 8 expected skill names — the file has trailing
# "## 1. What did we actually spend..." sample-query sections that share the
# numeric prefix syntax.
EXPECTED = {
    "russell-voice", "run-critique", "weekly-cash-forecast",
    "covenant-tracker", "renewal-forecast", "call-intelligence",
    "system-check", "class-aws-connector",
}
skill_sections = [s for s in sections if s["name"] in EXPECTED]

if {s["name"] for s in skill_sections} != EXPECTED:
    missing = EXPECTED - {s["name"] for s in skill_sections}
    print(f"WARN: missing expected skill sections: {missing}")

# Reference-block detection: "### Inlined reference: <filename>" followed by
# a ```markdown ... ``` block.
ref_heading_re = re.compile(
    r"^### Inlined reference:\s*([\w./-]+)",
    re.MULTILINE,
)

# Code-block extraction (```markdown ... ``` and ```yaml ... ``` patterns).
code_block_re = re.compile(r"^```(?:markdown|yaml|md)?\s*\n(.*?)^```", re.MULTILINE | re.DOTALL)

results = []

for s in skill_sections:
    section_text = text[s["start"]:s["end"]]
    skill_name = s["name"]
    out_dir = SKILLS_DIR / skill_name
    skill_file = out_dir / "SKILL.md"
    refs_dir = out_dir / "references"

    # First code block = SKILL.md content
    code_blocks = list(code_block_re.finditer(section_text))
    if not code_blocks:
        results.append((skill_name, "ERROR", "no code block found"))
        continue

    skill_content = code_blocks[0].group(1).rstrip() + "\n"

    if skill_file.exists():
        # Don't clobber an existing skill (e.g. class-brand-voice exists; though it's
        # not in EXPECTED, defense in depth).
        results.append((skill_name, "SKIP", f"already installed at {skill_file}"))
        continue

    out_dir.mkdir(parents=True, exist_ok=True)
    skill_file.write_text(skill_content, encoding="utf-8")
    installed_refs = []

    # For each "### Inlined reference: <fn>" heading, locate the next ```markdown
    # block AFTER the heading and within this section, and write it.
    ref_headings = list(ref_heading_re.finditer(section_text))
    for ref_h in ref_headings:
        ref_name = ref_h.group(1)
        # Strip any leading "references/" prefix; we already write under refs_dir.
        if ref_name.startswith("references/"):
            ref_name = ref_name[len("references/"):]
        ref_pos = ref_h.start()
        # Find the next code block after this heading.
        next_block = next((b for b in code_blocks if b.start() > ref_pos), None)
        if not next_block:
            continue
        ref_content = next_block.group(1).rstrip() + "\n"
        refs_dir.mkdir(parents=True, exist_ok=True)
        (refs_dir / ref_name).write_text(ref_content, encoding="utf-8")
        installed_refs.append(ref_name)

    results.append((
        skill_name,
        "INSTALLED",
        f"SKILL.md ({len(skill_content)} bytes)"
        + (f" + {len(installed_refs)} refs: {', '.join(installed_refs)}" if installed_refs else "")
    ))

# Report
print(f"\nProcessed {len(skill_sections)} skill sections from {SRC.name}\n")
for name, status, detail in results:
    marker = {"INSTALLED": "[OK]", "SKIP": "[--]", "ERROR": "[!!]"}.get(status, "[??]")
    print(f"  {marker} {name:24s} {status:10s} {detail}")
print(f"\nInstall root: {SKILLS_DIR}")
