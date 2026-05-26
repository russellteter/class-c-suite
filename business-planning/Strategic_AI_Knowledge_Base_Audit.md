# Strategic AI Knowledge Base Audit

**Companion to:** `Strategic_AI_Operating_Model.md`
**Purpose:** Inventory of what Claude already deeply knows about Russell, Class, and the cash crisis — and what's missing.
**Audit date:** 2026-05-21

---

## Part 1: Auto-Memory Inventory

Location: `memory/` directory referenced from `MEMORY.md`.

16 memory files indexed in `MEMORY.md`. All carry a "3 days old" staleness flag (May 18-21, 2026 origin).

| File | Type | Summary | Freshness |
|---|---|---|---|
| `user_role_class.md` | user | Russell is a Class exec owning board narrative + business planning; prefers CFO-grade analysis; sequence: board deck → cash model → go-forward | Live |
| `class_debt_structure.md` | project | $25M Barclays Term + $5M Revolver (fully drawn) + $1.4M PIK = $31.4M total; ~$200-210K/mo cash interest; preferred zeroed; Holdco above op sub | Live |
| `class_restricted_cash.md` | project | Three cash pools: $1.68M unrestricted, $2.5M Barclays BACA, $3.245M Coso-TD (likely Knox). Board's $3.48M cash claim doesn't reconcile to NS | Live |
| `class_financial_state_may_2026.md` | project | ARR $35.85M → $20.57M (-43% / 16mo), monthly burn $400-700K, GM 53-58%, 47.9% Int'l Higher Ed concentration, stale AP ($9.1M Leitner, $3.18M Zoom) | Live |
| `class_cash_model_file.md` | reference | Path + sheet map to `Class_Cash_Model_2026-05-18.xlsx` — 9 sheets | Live |
| `netsuite_class_gotchas.md` | reference | SuiteQL quirks: foreign-currency totals, customer vs entity, ROWNUM not FETCH, no CTEs, TO_DATE literals, stale AP filtering | Live |
| `cash_lever_model_v5.md` | project | `Class_Cash_Lever_Model_v5_2026-05-18.xlsx` — 9 sheets. ONLY touch sheet `07_Weekly_Engine` unless asked | Live |
| `july_trough_problem.md` | project | $111,766 trough W30 (Jul 26). Employee cuts can't help (severance timing). Real levers: AR accel, AWS, AP defer, restricted cash | Live |
| `finance_cash_forecast_authoritative.md` | reference | May 10 Finance Cash Forecast XLSX = board deck slide 16 = ground truth | Live |
| `class_gtm_roster.md` | project | 41 active employees, $4.88M base / $7.85M FL annual; per-function breakdown | Live |
| `cfo_severance_policy.md` | project | 2-12 weeks by tenure/seniority, Spread mode not lump, Czech 5-mo statutory notice. Who can help July: Roxana, Kendall, maybe Clayton | Live |
| `class_aws_cli_setup.md` | reference | Two SSO profiles (`class` BillingAccess, `collab` Billing); ~$8-10K/day combined; ~$270K/mo annualized | Live |
| `class_aws_connector_skill.md` | reference | Skill packaged at `outputs/class-aws-connector.skill` | Live |
| `netsuite_payroll_blind_spot.md` | reference | NS has NO per-employee comp. Use Rippling/DocuSign. Only aggregate accts 2150/2301/2302 useful | Live |
| `russell_newco_equity_stack.md` | project | 180 Class E units + 2.25% MIP (max ~$675K), only pays on Deemed Liquidation Event = $0 in shutdown. Good Reason narrow, Cause broad, Barclays = 3rd-party beneficiary | Live |
| `coo_negotiation_leverage.md` | project | Russell's walk-away is leaving Class entirely, not staying SVP. Chasen has no replacement. Leverage is silent — never spoken | Live |

### Aggregate picture

**Russell (user).** SVP being promoted to COO, negotiating comp now, prefers blunt CFO-grade analysis over balanced framing, treats Claude as a finance partner. Existing equity is $0 EV in shutdown — creates a real stay/walk tension. External alternatives in $325-400K range.

**Class Technologies.** Late-stage SaaS in death spiral. ARR collapse, GM in 50s, $30M senior debt with PIK accruing, recently recapped (preferred zeroed, Class Holdco above op sub), 41 employees, payroll $654K/mo. International Higher Ed concentration (47.9%) is the single-segment risk. Renewals-only is the dominant 2027 scenario.

**The cash crisis.** Trough = $111,766 on July 26, 2026 (W30). Three cash pools — only $1.68M operational. Restricted cash access (BACA $2.5M, Coso-TD $3.245M) is unresolved Week 1 priority. Employee severance is spread mode — headcount cuts don't move July. Lever set: AR acceleration, AWS reduction, AP deferral, restricted cash release.

**Toolchain.** AWS CLI configured both orgs. Cash Lever Model v5 is active artifact. May 10 Finance Cash Forecast is authoritative baseline. NetSuite has known quirks and known blind spots (no per-employee comp).

This is enough domain context that future Claude can answer most CFO-level cash questions without re-discovering. Gaps: CRM/CRO data, marketing context, board-level strategic items beyond cash.

---

## Part 2: Business Planning Folder Inventory

Location: `/Users/russellteter/Documents/Claude/Projects/Business Planning/`

Flat folder, 42+ files. Modified May 18-21, 2026.

### Category breakdown

**Board materials (1 file):**
- `Class Board Meeting Slides - May 2026 (1) (1).pdf` (980K, May 18) — source-of-truth board deck.

**Financial models — Excel (4 files):**
- `Class_Cash_Lever_Model_v5_2026-05-18.xlsx` (89K, May 19) — **THE active artifact**.
- `Class_Cash_Model_2026-05-18.xlsx` (34K, May 18) — original 9-sheet NS-driven cash model.
- `Class_Scenario_Strategy_2026-05-18.xlsx` (34K, May 18) — scenario comparison.
- `Class_Cash_Lever_Model_v4_2026-05-18.html` (61K) — superseded by v5.

**HTML dashboards / earlier iterations (5 files):** Pre-v5 work product. Superseded.

**COO compensation negotiation (6 files, May 19-21):**
- `COO_Compensation_Proposal.md` — the package proposal (base $280K, 5mo severance, deemed-termination triggers).
- `COO_Compensation_Proposal_Russell_Internal.docx` — internal-facing version.
- `COO_Compensation_Proposal_Chasen.docx` — handover-to-Chasen version.
- `COO_Negotiation_Stress_Test.md` — opener vs fallback ladder, walk-away tests, trade matrix.
- `COO_Negotiation_Comp_Precedent.md` — exec comp precedent at Class.
- `COO_Comp_Components_Menu.md` — full options menu (rabbi trust, severance shields, §503(c)).

**AWS data + scripts (15+ files + `aws_data/` subfolder):**
- `class-aws-connector.skill` — packaged installable skill.
- 9 Python scripts: `aws_pull.py`, `aws_analyze.py`, `aws_deep.py/2/3`, `read_model.py`, `read_finance.py/2/3/4`, `list_collab_roles.py`.
- `aws_data/`: 16 JSON files for both `class` and `collab` orgs.

### 10 most important files

| # | File | Role |
|---|---|---|
| 1 | `Class_Cash_Lever_Model_v5_2026-05-18.xlsx` | Active cash lever model |
| 2 | `Class Board Meeting Slides - May 2026 (1) (1).pdf` | Board deck; slide 16 = canonical cash chart |
| 3 | `Class_Cash_Model_2026-05-18.xlsx` | Original 9-sheet NS-driven cash model |
| 4 | `COO_Compensation_Proposal.md` | Russell's COO ask |
| 5 | `COO_Negotiation_Stress_Test.md` | Calibrated opener + fallback ladder |
| 6 | `COO_Comp_Components_Menu.md` | Full comp toolbox including rabbi trust + §503(c) |
| 7 | `COO_Negotiation_Comp_Precedent.md` | Internal exec comp precedent |
| 8 | `Class_Scenario_Strategy_2026-05-18.xlsx` | Cross-scenario comparison (Base, T1+2+3, Stress, Renewals Only) |
| 9 | `class-aws-connector.skill` | Installable AWS connector skill |
| 10 | `aws_data/class_acct_daily.json` + `collab_acct_daily.json` | Daily spend by linked account |

---

## Part 3: Knowledge Gaps for C-Level Work

### CEO — missing strategic context
- Board minutes / governance — no minutes, no investor consent records, no committee charters
- Cap table detail — known at GL summary only; no actual cap table file, no waterfall, no Newco LLC agreement on disk
- Competitive landscape — no positioning analysis vs Canvas/Blackboard/D2L/Moodle/Engageli, no market sizing, no win/loss
- Strategic options memo — no documented M&A targets, no banker conversation log
- Board materials beyond May — only one deck on disk; prior board pre-reads not captured
- Customer concentration detail — 47.9% Int'l Higher Ed known but no named-customer revenue list

### CFO — missing financial depth
- Vendor contracts — no Anthology, AWS EDP/RI, Zoom, Carahsoft, major SaaS subscription paperwork
- AR aging by customer — summary only; per-customer detail not on disk
- AP detail by vendor — stale items flagged ($9.1M Leitner, $3.18M Zoom) but no full vendor list with payment terms
- Unit economics — no LTV/CAC, no payback, no cohort retention curves
- Deferred revenue waterfall — $8.275M noted but no recognition schedule by month
- Tax — $1.124M deferred tax liability noted; no NOL analysis, no carryforward schedule
- Treasury — BACA + Coso-TD access mechanics unresolved
- 13-week cash forecast methodology — model exists but the assumptions aren't fully captured

### CRO — missing GTM depth
- Rep performance — roster has FL comp but no quota attainment, no closed-won by rep, no pipeline by rep
- Pipeline detail — queryable from Salesforce but not pre-captured
- Churn analysis — 82% Class / 91% Consulting known at aggregate; no logo-level churn reasons, no at-risk list
- Renewal calendar — no quarter-by-quarter book with $ at risk per logo
- Segment economics — 47.9% Int'l HEd concentration but no per-segment GM or retention
- Sales motion / playbook — no current process docs, no ICP definition file, no win/loss debriefs

### CMO — missing marketing context
- Brand audit — no brand guidelines, no voice/tone doc on disk
- Competitor positioning — also CMO gap
- Content inventory — no website page list, no content calendar, no campaign performance data
- Demand gen — no MQL/SQL funnel, no channel mix, no CAC by channel
- Pricing & packaging — no current pricing matrix, no discount governance

### Chief of Staff — missing process context
- Org chart — GTM roster is a list; no actual reporting lines beyond named individuals
- Decision log — no record of major exec decisions (notable gap given crisis)
- Meeting cadence — no standing meetings, no agenda templates, no operating rhythm
- OKRs — no documented 2026 company OKRs
- Process documentation — no SOPs, no RACI, no handoff diagrams
- Communication artifacts — no all-hands history, no internal comms templates

---

## Part 4: Foundational Files Map (Where to look first)

| C-Level | Authoritative Source | File Path |
|---|---|---|
| CEO | Board narrative & financial story | `Class Board Meeting Slides - May 2026 (1) (1).pdf` |
| CEO | Strategic state of the company | Memory: `class_financial_state_may_2026.md` + `class_debt_structure.md` |
| CFO | Active cash lever model | `Class_Cash_Lever_Model_v5_2026-05-18.xlsx` |
| CFO | NS-driven 12mo cash model | `Class_Cash_Model_2026-05-18.xlsx` |
| CFO | Authoritative weekly cash baseline | May 10 Finance Cash Forecast (per memory `finance_cash_forecast_authoritative.md`) |
| CFO | Trough definition | Memory: `july_trough_problem.md` |
| CFO | NS query patterns | Memory: `netsuite_class_gotchas.md` + `netsuite_payroll_blind_spot.md` |
| CFO | AWS cost data | `class-aws-connector.skill` + `aws_data/*.json` + memory `class_aws_cli_setup.md` |
| CFO | Scenario comparison | `Class_Scenario_Strategy_2026-05-18.xlsx` |
| CRO | GTM roster + per-person FL cost | Memory: `class_gtm_roster.md` |
| CRO | Renewal trajectory + ARR cliff | Memory: `class_financial_state_may_2026.md` |
| CRO | Live pipeline | Salesforce MCP (not file-based) |
| CRO | Severance impact on cuts | Memory: `cfo_severance_policy.md` |
| CMO | (no foundational file on disk yet) | — gap to fill |
| Chief of Staff | Org headcount | Memory: `class_gtm_roster.md` |
| Chief of Staff | Active strategic workstreams | Memory: `user_role_class.md` |
| Russell-personal | COO comp ask (final) | `COO_Compensation_Proposal.md` |
| Russell-personal | Negotiation playbook | `COO_Negotiation_Stress_Test.md` |
| Russell-personal | Comp options menu | `COO_Comp_Components_Menu.md` |
| Russell-personal | Internal Class comp precedent | `COO_Negotiation_Comp_Precedent.md` |
| Russell-personal | Existing equity / Newco context | Memory: `russell_newco_equity_stack.md` |
| Russell-personal | Negotiation leverage doctrine | Memory: `coo_negotiation_leverage.md` |

---

## Key observations for the operating model

1. **Finance is deeply covered; GTM/marketing is thin.** CFO surface area has ~10 mature artifacts. CRO/CMO have essentially zero on disk — live MCPs (Salesforce, Common Room) are the path forward.
2. **The folder is flat.** As files multiply, the operating model should consider subfolders: `/board/`, `/cash/`, `/aws/`, `/gtm/`, `/comp-negotiation/`, `/scenarios/`, `/investigations/`, `/deliverables/`.
3. **HTML iterations should be archived.** v1/v2/v3 tranche analyses + v4 lever model HTML are superseded by v5 Excel — clutter risk.
4. **External-data dependencies live in session uploads.** The May 10 Finance Cash Forecast XLSX and the GTM roster CSV both live in session uploads, not the project folder — they need re-upload at session start. Worth canonicalizing into the folder.
5. **Memory staleness flag is active.** Every memory file shows the "3 days old" warning. The operating model needs weekly verification cadence against live data sources (NS, AWS, SF).

---

*End of audit. The gaps listed in Part 3 are the natural agenda for the next several `/deep` investigations.*
