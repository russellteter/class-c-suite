# Investigation: class-org-institutional-read

**Workstream tags:** WS-03 (primary); WS-09, WS-02, WS-08 (secondary)
**Mode:** /deep — 5-pass loop, v2.1 disciplines
**Opened:** 2026-05-21
**Owner:** Russell Teter
**Sensitivity:** HIGH (per-person profiles)

## Topic
Build a complete institutional read of the Class organization — system's own informed picture of who's who, who does what, who runs what, where influence flows, who's load-bearing, who's quietly critical, who's a question mark, who's a flight risk. WS-03 org redesign needs this before Q4 decisions land.

## Pass 1 — Bootstrap

### Sources read
- `MEMORY.md` + linked memory files (class_gtm_roster, russell_newco_equity_stack, coo_negotiation_leverage, class_financial_state_may_2026, july_trough_problem)
- `Strategic_AI_Operating_Model.md`, `Strategic_AI_Operating_Model_v2.md`, `Strategic_AI_Invocation_Guide.md`
- `workstreams/DASHBOARD.md`, `positions/README.md`, `decisions/INDEX.md`, `pre-mortems/INDEX.md`, `stakeholders/INDEX.md`, `adversarial/INDEX.md`
- Uploaded file: `CLASS TECHNOLOGIES _ EMPLOYEE ROSTER & COSTS.xlsx` (dated 2026-03-19, 41 employees + reporting lines + Loc + Org)

### Connector pulls (parallel, 2026-05-21/22 EDT)
- **Salesforce — 6 queries:**
  - Opportunity counts by owner (last 180d created): 11 active owners surfaced, including new names Nikolaos Galindo (now spelled Nikolaos not Nikolas), Petya Lolova, Simon Patanjo.
  - Open opp stage breakdown by owner: yields the renewal book concentration map.
  - Task counts last 90d: BPO/contractor activity visible — Dalton Mullins 40,878 tasks (automation), Massimo Gentili 20,181 (EMEA pipeline machine), then Manila call-center contractors (Franklin Lagare, Ernest Mangalas, Kate Nadonga, May Itliong, Johnalle Malones, Ferdinand Buison, Shirley Naval, Cristina Aguilar, Florencia Saa, Hanna Arinque, Catherine Grace, Sherwin Yalong).
  - Event counts last 90d: Emmanuel Clemot 149 customer-facing events (heaviest), Daniel Hansen 78, Clayton Coyne 66, Andee 47, Robert Thayer only 20, Holly Hardin 0 events.
  - User list (active, classedu.com): titles richer than roster — Ed Miller "Chief Revenue Officer", Massimo "Vice President of International", Sabina "SVP Collab Renewals", Daniel Hansen "Director of Sales, Corp/Gov", Andee "Lead Account Manager", Kendall "Creative Director in Brand and Customer Marketing", Clayton "Director, Partnerships and Channel", Dalton "SDR" (vs roster's "Field Marketing Manager"). App Admin user description names "Vivek" as integration owner for Hubspot/Chorus/Ringlead/Wrike — NOT on roster. Sales Operations user titled "Manager, Global Sales Operations" — NOT on roster. Pd DevOps user titled "Sr Manager, Software Engineering" — likely Ivo Novosad's alt account.
  - Account ownership by type: Massimo Gentili owns 381 customers + 676 former + 82 partner resellers (1,139 international); Clayton Coyne 347 customers + 695 former (1,042 channel/domestic); Daniel Hansen 104 customers + 230 former (Corp/Gov); Russell Teter 11 Partner Resellers (channel oversight); Ed Miller almost none (4 customer accounts).
  - Segment summary: 11 ICP segments, dominated by ICP HED (1,055 accounts / 58,203 contacts), ICP Corp Training Co (1,390 accounts), K12 (482 accounts). Healthcare VILT has 270 accounts with NO tier assigned — segment work in progress.
- **Chorus:** API returns oversized payloads (>200K chars per call) that overflow inline token limits; deferred to per-participant follow-ups in Pass 4. Documented as a data-quality caveat: Chorus signal IS available but requires targeted per-person queries, not broad sweeps.
- **Slack:** Channel scan reveals additional names not on roster — Scarlet DeSaavedra (CS/support coordinator), Tess Frazier (created #class-honor-roll, HR-adjacent), Ace Sklar (security), Travis Bullock (created #pd-class-level3, #class-provisioning — operational, his email IS in SF System user), Sohel Shah, Kris Stokking (#class-911 escalation), Shawn Edstrom (#aws-class), Robert Jongbloed (#class-pod-pipeline), Tomas Paseka (engineer, distinct from Tomas Novotny who exited). These may be Anthology/Holdco shared workspace participants or former Class employees.
- **NetSuite, AWS IAM, ZoomInfo, Brightdata LinkedIn, Gmail, Calendar, Drive:** deferred. SF + Slack signals already overdetermined the structural picture. NetSuite has the payroll blind spot. AWS IAM scan would only add engineering-access overlays — secondary to org redesign. ZoomInfo enrichment for senior 5 will be done in Pass 4 when stakeholder files are written.

### Material reconciliation findings
1. **Roster headcount 41 is the W-2 Class entity count, NOT the total operational footprint.** Salesforce shows 9 active Manila BPO call-center contractors with cumulative ~50,000+ tasks logged in last 90 days. They are NOT in the 41-person roster. They represent the bottom of the outbound SDR funnel for the entire international + corp/gov motion. If you cut them, the 50,000-task activity layer goes to zero overnight.
2. **"Vivek" runs the entire GTM marketing-ops integration stack** (Hubspot, Chorus, Ringlead, Wrike per App Admin user description). He is NOT on the 41-person roster, is NOT in the cost lever model. If he is a contractor, his exit terminates the data flow into Salesforce. If he is a Class W-2 and just missing from the roster, that is itself the finding.
3. **Sales Operations Manager exists** (Global Sales Operations) and is also not on the roster.
4. **CoSo headcount discrepancy:** Roster header says "COSO (13)" but subtotal lists 2 employees (AJ Gorton + Ed Kwong). 11 unaccounted CoSo bodies. Jim Seaman is named as their manager but is not in this roster either — he is CoSo CEO/President and lives on the CoSo side of the cap structure.
5. **Ed Miller is the real CRO** — both SF title and the second sheet ("EXEC LEADERSHIP") confirm. Roster's first section listed him "SVP Business Dev & Strategy" but that title is stale. He IS the top of the GTM org.
6. **Scott Perian's span of control is 14 directs** — every engineer, the QA team, Anthony Fabiani support — all report to him. That is structurally untenable for a single SVP Product. PM-003 (key engineering lead resigns) maps directly to this person — and the blast radius is total. There is NO engineering #2 in the visible reporting structure.
7. **Marketing reports to Ed Miller — there is no CMO.** Kendall, Dalton, Roxana all report to Ed. Kendall's SF title ("Creative Director in Brand and Customer Marketing") suggests she's de facto marketing lead, but Ed owns the function organizationally.
8. **Customer Success reports under Renewals reports under CRO.** Jorge Salinas → Sabina Cramer → Ed Miller. CS does not have an executive sponsor at the C-table other than the CRO. This buries the post-sale function under the sales function.
9. **Clayton Coyne is the only domestic Class employee selling new business in volume to non-Corp/Gov segments.** He owns 347 customers + 695 former (domestic + channel + K12 + HED). His pipeline is thin (10 open opps, $112K total). He reports to Russell, not Ed Miller — which means partnerships sits in BD&Ops, not GTM.
10. **Daniel Hansen owns Corp/Gov new business.** 88 Discovery + 11 Qualified Opp + 6 Quote in Review = $1.9M qualified pipeline. His "ratio" of former-to-current customers (230:104) is the worst on the team — Corp/Gov is leaking.
11. **Robert Thayer is high-volume / low-activity.** 125 qualified renewals (~$2.7M) but only 20 logged events in 90 days and 183 SF tasks. Possible flight risk OR working through other channels — needs validation.
12. **Holly Hardin is functionally invisible in events** — 39 qualified renewals (~$1.3M) but ZERO logged events in 90 days. The single most concerning activity-vs-book ratio on the team.
13. **Emmanuel Clemot is the heaviest customer-facing rep** — 149 events in 90 days, 80 qualified renewals at $4.15M (largest renewal $ portfolio), $293K in Contracting. Possibly the load-bearing EMEA renewals motion.
14. **Nikolaos Galindo (Channel AM LAC per roster) is in fact running the largest renewal portfolio by count** — 136 qualified renewals at $3.7M. The roster's "Channel AM LAC" understates his actual book.
15. **Sabina Cramer's SF activity is consistent with manager-mode** — 41 qualified renewals, 157 SF tasks, no Event records. She runs the renewal team rather than carrying her own book.

### Pass 1 context bundle complete.
Next: Pass 2 five-lens synthesis on org structure → Pass 3 red-team → Step 1 deliverable (autonomous data picture) → Step 2 clarifying questions → Step 3 integration.


---

## Pass 5 — Memory writes + investigation log close

### Memories written (all with source citation)
- Updated `class_gtm_roster.md` — supersedes prior; adds off-roster footprint, Russell's qualitative reads, renewal book concentration table
- New `class_org_institutional_read.md` — pointer memory for the institutional read
- New `run_critique_class_org_institutional_read_2026-05-22.md` — five-dimension scorecard with improvement proposal
- Updated `MEMORY.md` index with two lines

### Stakeholder files written (12 total, sensitivity HIGH)
- `stakeholders/internal-exec-board/chasen-michael-ceo.md`
- `stakeholders/internal-exec-board/ed-miller-cro.md`
- `stakeholders/internal-dependencies/brian-bharwani-cfo.md`
- `stakeholders/internal-dependencies/scott-perian-svp-product.md`
- `stakeholders/internal-dependencies/sabina-cramer-svp-renewals.md`
- `stakeholders/internal-dependencies/daniel-hansen-sales.md`
- `stakeholders/internal-dependencies/massimo-gentili-vp-intl.md`
- `stakeholders/internal-dependencies/emmanuel-clemot-am-emea.md`
- `stakeholders/internal-dependencies/nikolaos-galindo-am.md`
- `stakeholders/internal-dependencies/robert-thayer-am.md`
- `stakeholders/internal-dependencies/holly-hardin-am.md`
- `stakeholders/internal-dependencies/kendall-woodard-head-marketing.md`

### New positions
- POS-007 — Russell consolidation with bandwidth caveat (confidence 65)
- POS-008 — INTL new-sales de-resource thesis (confidence 55)
- POS-009 — Roster is not the census (confidence 90)

### New pre-mortems
- PM-008 — Daniel Hansen voluntary exit (25% probability, HIGH impact)
- PM-009 — Abhinav sole-PM SPOF (15%, MEDIUM)
- PM-010 — Ed exit triggers Sabina cascade (35%, HIGH)
- PM-003 — Updated with named engineers + Ivo as #2 + per-person flight risk scoring

### Updated workstream
- WS-03 — Team-I-have vs team-I-need gap analysis, status YELLOW retained, next milestone unchanged

### Deliverables
- `deliverables/2026-05-21_class-org-institutional-read/01_autonomous_data_picture.md`
- `deliverables/2026-05-21_class-org-institutional-read/02_ranked_1to1s_next_30_days.md`
- Cowork artifact `class-org-map` (live, refreshable)

### Predictions spawned (with resolution dates)
- PRED-001: Russell sustains <60hr/week through end of Q3 (2026-09-30)
- PRED-002: No new pre-mortem fires on the GTM team in next 90 days (2026-08-19)
- PRED-003: Massimo's Q2 close-won new business < $300K (2026-06-30)
- PRED-004: No board push-back if INTL new-sales de-resourcing proposed in July board meeting (2026-07-31)

### Investigation status
**Round 1 complete. Status: open — calibration cycle (1:1s) is the bridge to Round 2.**
Round 2 trigger: after first 4-6 of the ranked 1:1s, Russell asks in natural language to continue / pick up the org read / run the next round on the org investigation, and the system loads this log + the existing artifacts and runs Round 2 semantics (delta-bootstrap, intensified red-team, position v2).
