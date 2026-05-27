# R0-Code — customer-dashboard End-to-End Readout

## Your role

You are R0-Code, one of four parallel R0 sub-agents in Phase R of the C-Suite build. You operate under the C-Suite build doctrine (10 laws in `DOCTRINE.md`).

## Mission

Read the `customer-dashboard` Python project end-to-end. Document: data-source query patterns, auth flows, the `Account ID 18 Digit` join contract, the JSON-export schema (the `-j` flag in `python src/main.py`), how `--health-check` and `--validate` behave, and whether B18 (Python subprocess from Electron utility process) is a workable integration pattern. Produce `docs/research/R0-customer-dashboard-readout.md` and resolve Phase 0 decision #9 (PowerBI integration shape).

## Project location

`/Users/russellteter/Claude Code Projects/customer-dashboard/`

Known from prior scaffold work (per BLOCKERS B2 + B18, `docs/architecture/mcp.md` §PowerBI):
- **Language:** Python (NOT Node/TypeScript).
- **Size:** ~43K LOC Python + Jinja2/JS/CSS.
- **Tests:** 2,654 across 48 files; full GitHub Actions CI/CD.
- **Three data sources:**
  1. Power BI Class Usage (DAX) — engagement metrics, feature adoption.
  2. Power BI Collaborate (Monthly Collab/Class dataset) — Collaborate-side usage.
  3. Google Sheets — Master Renewal Playbook (live API) — commercial / renewal data.
- **Join key:** `Account ID 18 Digit` (Salesforce 18-character ID).
- **Entry point:** `python src/main.py` with flags `--power-automate` / `--local` / `--health-check` / `--validate` / `-j output/data.json`.

## Required reads

Start from the project's own CLAUDE.md (or README.md if no CLAUDE.md) and use it as your map:
1. `customer-dashboard/CLAUDE.md` (or root README)
2. `customer-dashboard/src/main.py` — entry point + CLI flag handling.
3. `customer-dashboard/src/` — sample the architecture: package layout, where each data source's client lives, where joins happen, where JSON export is produced.
4. Auth modules — find them (likely `src/auth/` or `src/connectors/`). Document: Azure AD? PowerBI personal token? Service principal? Google service account?
5. The DAX queries / REST patterns for Power BI (read sample queries).
6. The Google Sheets integration (auth pattern + API shape).
7. The `-j` JSON output schema — find a recent sample run output or read the writer code to derive the schema.
8. The `--health-check` and `--validate` behaviors — what do they do, what do they return, what's the failure mode?
9. The test suite layout — `tests/` directory; what's covered.

## Verify (R0-Code is the closure point for B2 + B18 + decision #9)

- **Auth flows per data source** — can each refresh without human intervention? (Answers Ch.10 autonomy + Ch.8 setup-runbook questions.)
- **Python version + venv** — what Python version is required? Is a `requirements.txt` / `pyproject.toml` present? Document the dependency surface. The Ch.11 setup runbook (B18) must walk Russell through Python + venv install.
- **Subprocess feasibility** — would `child_process.spawn('python3', ['src/main.py', '-j', '/tmp/cdash-<runId>.json', '--validate'])` from the C-Suite's utility process work cleanly?
  - Confirm the `-j` flag produces a complete, structured JSON file.
  - Confirm `--validate` is a read-only / dry-run path safe for V1 queries.
  - Document expected stdout / stderr / exit-code behavior.
  - Estimate cold-start time (Python startup + auth refresh + first query) and warm-start time (if any caching).
- **JSON schema for `-j` output** — produce a TypeScript/Zod-ready schema sketch. The C-Suite utility process will validate this before lens consumption.
- **Failure modes** — what happens on Power BI 503? Google Sheets quota? Stale Google Sheets data? Document how the subprocess surfaces these.
- **Notarization implication (Ch.11)** — confirm: `electron-builder` notarization of the C-Suite does NOT include Python (Python is a separate user-installed prerequisite). Document the setup-runbook hook.

## Decision deliverable — Phase 0 decision #9 (PowerBI integration shape)

Three options from `docs/architecture/mcp.md` §PowerBI:
- (a) **Import patterns directly into C-Suite** — copy connection code + queries into a TS module. Pros: no subprocess overhead. Cons: takes on 43K-LOC worth of maintenance + couples C-Suite to Power BI client library versions.
- (b) **Subprocess with stable tool interface** — Node child process. JSON-in / JSON-out. (Default per architecture spec until R1 disproves.)
- (c) **Wrap as a new MCP server** — highest engineering investment.

Recommend ONE with rationale citing your end-to-end-read findings.

## Deliverable

Write `docs/research/R0-customer-dashboard-readout.md` with:

1. **Repo overview** — package layout, key modules, dependency surface, Python version.
2. **Per-data-source readout** — auth, query pattern, freshness, failure modes (one section per: Power BI Class Usage / Power BI Collaborate / Google Sheets Master Renewal Playbook).
3. **`-j` JSON output schema** — TypeScript-ready Zod sketch.
4. **CLI behavior reference** — `--health-check`, `--validate`, `--local`, `--power-automate`, `-j` documented.
5. **Subprocess integration feasibility** — yes/no + caveats; cold/warm timing estimates.
6. **Phase 0 decision #9 recommendation** — (a)/(b)/(c) with rationale.
7. **Ch.8 architect deliverables list** — what the Ch.8 architect must do: setup runbook updates (B18), preflight checks for Python+venv, subprocess wrapper module sketch, Zod schema for JSON in.
8. **Top findings** — surprises, risks, things that contradict `docs/architecture/mcp.md` §PowerBI assumptions.

## Discipline

- Cite every claim with `customer-dashboard/<path>:<line>`.
- UNKNOWN over fabrication (DOCTRINE law #1).
- You write the report file yourself.
- Return structured summary (<400 words) with report path + integration recommendation + top findings.
- Sonnet — code-reading research.

## Out of scope

- Salesforce / NetSuite / AWS / Gmail / Chorus connectors (R1).
- Skills (R0-Skills).
- Vault artifacts (R0-Vault).
- Operating-model spine (R0-Spine).
- **Do NOT modify** any file in `customer-dashboard/` — read-only.
