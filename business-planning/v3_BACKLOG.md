# v3 Backlog — What's Still Open

**Purpose:** Single source of truth for items not yet built into the operating model. Updated as items move into v3.x increments.

Last updated: 2026-05-21

---

## Ranked by leverage

### 1. Ramp MCP connection (free, blocked only by confirmation)
**What:** Connect the Ramp MCP if Class is a Ramp customer. Tools: `execute_query`, `load_spend_export`, `load_purchase_orders`, `load_cards`, `load_limits`, `load_entities`.
**Why:** Closes AP visibility gap directly into the cash lever model. AP deferral targeting becomes precise.
**Blocker:** Confirm with CFO whether Class uses Ramp. If yes, ~5 min to connect.
**Action:** Russell asks CFO at next finance sync.

### 2. Lock Barclays facility verbatim covenant terms
**What:** CFO inputs the exact covenant definitions from the credit agreement into `skills/covenant-tracker/SKILL.md` § "Locked Facility Terms."
**Why:** Turns the covenant-tracker skill from directional reading to actual compliance-grade. PM-001 prevention strengthens significantly.
**Blocker:** Russell or CFO time, ~30 min.
**Specifics needed:** Total Debt / TTM Adj EBITDA threshold; FCCR threshold; Minimum Liquidity threshold (including BACA inclusion question); Maximum Customer Concentration threshold; test dates; equity-cure provisions; cross-default triggers; MAC clause language.

### 3. Day Zero confirmations on four skills
**What:** Lock the ASSUMED defaults in four skills.
- `renewal-forecast`: Class NRR formula, board NRR target, eight-signal risk weights
- `call-intelligence`: competitor list (defaults: Engageli, Top Hat, Anthology/Canvas, D2L, Moodle), sentiment-cue phrase list, CRITICAL escalation cutoff (default 70)
- `run-critique`: five-dimension weights (defaults: 25/20/20/20/15), composite-score band thresholds, whether to surface composite scores by default
- `weekly-cash-forecast`: no Day Zero needed — works as shipped
**Blocker:** 15-30 min total of Russell time.
**Action:** Russell + Claude in a single session to lock all four.

### 4. Cross-Claude Knowledge Spine bootstrap
**What:** Create `_spine/` at `/Users/russellteter/Documents/Claude/Projects/_spine/` and run the v2 bootstrap sequence (Strategic_AI_Operating_Model_v2.md §7, steps 10-15). Five ingestion scheduled tasks. Identity graph. Knowledge Spine Cowork artifact.
**Why:** Continuous structured ingestion of Slack/Gmail/Drive. Cross-project memory bridging across Class / Apply / Locality. Identity resolution unifying Chasen across systems.
**Blocker:** ~30 min of build + 30 min backfill (ingest last 30 days).
**Action:** Run "Run Day One bootstrap on the Strategic AI Operating Model v2" in a dedicated session.

### 5. Payroll / HRIS MCP (waiting on registry)
**What:** Connect Rippling, Gusto, or ADP MCP when one appears in the registry.
**Why:** Closes the NetSuite payroll blind spot. Severance modeling becomes live instead of via local roster.
**Blocker:** Not in registry as of 2026-05-21. Check monthly via `search_mcp_registry`.
**Workaround:** Use the GTM roster memory + CFO severance policy memory. This works; just not as fresh.

### 6. Product telemetry MCP (waiting on registry)
**What:** Connect Amplitude, Mixpanel, or Pendo MCP when one appears in the registry.
**Why:** Closes the gap that prevents POS-004 (Intl HED concentration risk) from moving above 70% confidence. Segment-level usage signal would let us see WHICH customers are using the platform vs renewing on inertia.
**Blocker:** Not in registry as of 2026-05-21. Also requires Class to have a subscription to one of these.
**Workaround:** None directly. Inferred usage from Salesforce activity + Chorus call frequency + NetSuite billing trend.

### 7. Mercury MCP (probably not applicable)
**What:** Mercury MCP exists and is free. Would close treasury gap if Class banks with Mercury.
**Blocker:** Class primary bank is Barclays per memory. Probably not applicable.
**Action:** Verify Class's operating bank with CFO. If any account is at Mercury, connect.

### 8. Materialize remaining pre-seeded files
**What:** Create individual files for decisions (4), predictions (5), stakeholder models (~30), and adversarial entries (~10). Currently their content lives in INDEX.md / DASHBOARD.md / SCORECARD.md files but not as individual entries.
**Why:** Polish. The system functions today via INDEX content. Individual files make audit trails cleaner and faster to update.
**Blocker:** Time. Each file is small but there are ~50 total.
**Action:** Materialize on use — when a /deep references a decision or stakeholder, create that file then.

### 9. Authoring `cash-lever-investigation` skill
**What:** After 3+ /deep runs on cash topics, codify the recurring pattern via skill-creator.
**Why:** Compounding — each cash investigation gets faster and more rigorous.
**Blocker:** Need 3+ runs first. run-critique skill will propose the codification when the pattern emerges.

### 10. Custom MCP servers for things without registry coverage
**What:** Use `mcp-builder` skill to author custom MCPs for: Holdco portal, Barclays portal, Rippling (if no registry entry materializes).
**Why:** Last-mile access without falling back to Chrome control every time.
**Blocker:** Time + API documentation. Each custom MCP is half a day to a day of work.

---

## Items explicitly NOT in v3 backlog

These have been considered and explicitly NOT pursued:

- **FedRAMP pursuit** — wrong cash state per `adversarial/regulatory-watch/fedramp-cost-vs-benefit.md`. 2027+ payoff against 2026 survival.
- **Building internal AI infrastructure** — buy don't build per turnaround library §7.
- **Adobe-style revenue-model transition** — no balance sheet to absorb the dip.

---

## How to update this file

When an item is completed → move to a `## Completed` section below with a date.
When a new gap is identified → add it ranked by leverage.
When ranking changes → renumber.

The run-critique skill auto-flags pattern-emergence that should become new backlog items.

---

## Completed (none yet)
