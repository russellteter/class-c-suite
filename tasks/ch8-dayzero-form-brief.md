# Ch.8 Wave 1 — Day-Zero Form Builder Brief (B6 + B19)

You are the Day-Zero form sub-agent. Single-purpose: build a small html-driven-codev form that captures Russell's verbatim covenant terms + committed-pipeline mental model. Contract: `docs/decisions/0010-ch8-mcp-integration.md` §11 + BLOCKERS §B6 + §B19.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Why
- B6: Barclays covenant thresholds are ASSUMED. `covenant-tracker` skill ships with directional numbers; need verbatim from Russell.
- B19: "Committed pipeline" filter — typed SOQL builder ships with R1-verified conservative default; needs Russell's confirmation that it matches his forecasting practice.

Until the form is answered, every memo that consumes either source is flagged "directional pending Day-Zero confirmation." Form answers unblock the flag.

## Deliverable
Build at `~/Desktop/csuite-ch8-dayzero-form/`:

| File | Purpose |
|---|---|
| `index.html` | Single-page form with 5 questions (see §1 below). |
| `submit.html` | Confirmation page on submit. |
| `server.py` | Local HTTP server. Serve folder + POST `/submit` → write `business-planning/_dayzero/2026-05-27-ch8-form.md` (the canonical doc) + `/tmp/csuite-ch8-dayzero.json`. |
| `launch.sh` | `python3 server.py & ; sleep 0.5 && open http://127.0.0.1:8767/` (port 8767 to avoid Ch.7 design-gate port 8766 collision). `chmod +x`. |

## §1 Form questions (verbatim — don't paraphrase)

1. **Committed pipeline (B19) — confirm or refine.**
   Text:
   > The R1-verified default for "committed pipeline" is:
   > - New business: `StageName IN ('Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review', 'Negotiation')` (~47 active deals).
   > - Renewal: `StageName IN ('Renewal Quote Sent', 'Qualified Renewal')` (~564 deals).
   > Is this how YOU forecast "committed" to the board? If different — name the stages you actually use.
   - Single textarea, multi-line.

2. **Barclays covenant — leverage ratio.**
   Text: "Verbatim threshold from the Barclays credit agreement. Format: `X.Yx Net Debt / Adj EBITDA, measured quarterly` or however your covenant reads. Paste the exact wording if you have it. Cure period?"
   - Multi-line textarea + cure-period number input.

3. **Barclays covenant — FCCR.**
   Text: "Fixed Charge Coverage Ratio — verbatim threshold + measurement frequency."
   - Multi-line textarea.

4. **Barclays covenant — customer concentration.**
   Text: "Customer concentration test — top-N customer revenue percent cap. Verbatim from the agreement."
   - Multi-line textarea.

5. **Covenant grace period + cure semantics.**
   Text: "What's the grace period before a covenant breach triggers? What's the reporting obligation if a tripwire flips?"
   - Multi-line textarea.

## §2 Output format

`business-planning/_dayzero/2026-05-27-ch8-form.md` should be:

```markdown
# Day-Zero Form — Ch.8 (2026-05-27)
**Submitted:** <ISO timestamp>
**Captures:** B6 covenant terms + B19 committed-pipeline definition.

## 1. Committed pipeline (B19)
<russell's answer>

## 2. Leverage covenant (B6)
**Threshold:** <answer>
**Cure period (days):** <answer>

## 3. FCCR covenant (B6)
<answer>

## 4. Customer concentration (B6)
<answer>

## 5. Grace period + cure semantics (B6)
<answer>
```

JSON output at `/tmp/csuite-ch8-dayzero.json` carries the structured answers (`{ committed_pipeline, leverage, fccr, concentration, grace }`).

## §3 Server behavior

- Listen 127.0.0.1:8767.
- GET `/` → index.html. GET `/submit.html` → submit.html.
- POST `/submit` → parse JSON body, write the two output files, return submit.html.
- On submit success: kill self after 5s (the form is one-shot).

## §4 Design

- Inherit the visual system from `~/Desktop/csuite-ch7-design/` (navy 900 / gold 500 / purple 500 / glassmorphic surfaces / system fonts).
- Self-contained: inline CSS, no external requests.
- Each question card has the question text + textareas + minor hint ("verbatim from credit agreement is best — paste even if it's a long paragraph").
- Submit button disabled until all 5 questions have content (don't enforce length — empty-string is the disable check).
- Plain prose. No emoji. No marketing copy.

## §5 Constraints

- Path with spaces — quote it in `launch.sh`: `"/Users/russellteter/Claude Code Projects/c-suite/business-planning/_dayzero/..."`.
- Ensure `business-planning/_dayzero/` exists or `mkdir -p` first.
- Do NOT auto-launch the server in this task — Russell launches when ready. Just build the files.
- Do NOT commit the mockup files to the c-suite repo (they live on Desktop). DO commit the canonical doc path expectations + this brief.

## §6 What "done" looks like

- 4 files written under `~/Desktop/csuite-ch8-dayzero-form/` + chmod +x on launch.sh.
- Test server starts (briefly — kill before report) and POST handler works (curl test).
- No commits (Russell submits to land the answers; the orchestrator commits after).
- Russell-action item surfaced: "Run `~/Desktop/csuite-ch8-dayzero-form/launch.sh` and submit when ready. Form is non-blocking — Salesforce + PowerBI sub-agents continue without it."

## Report-back (≤150 words)

- Files written + paths.
- Server tested briefly via curl (yes/no).
- The launch.sh invocation for Russell.

DO NOT touch other Ch.8 surfaces. Single-purpose.
