# Class Organization — Autonomous Data Picture
## The system's own informed read, before any human clarification

**Date assembled:** 2026-05-21
**Sources:** GTM roster (3/19/2026 snapshot, 41 W-2s), Salesforce (6 queries, ownership/activity/users), Slack (channel scan), memory (Russell role, financial state, severance policy, AWS), prior session transcripts.
**Sensitivity:** HIGH (per-person profiles, flight-risk reads). Excluded from external-facing output until re-confirmed.
**Workstream tags:** WS-03 primary; WS-02/WS-08/WS-09 secondary.

---

## A. Inferred Org Chart (data-derived; numbers are confidence flags)

```
Michael Chasen (CEO) [HIGH]
├── Brian Bharwani (CFO) [HIGH]
│   ├── Nicole Brantley (VP Accounting) [HIGH]
│   ├── Andy Prescott (Dir Rev Accounting) [HIGH]
│   └── Kyle Delaney (Revenue Manager) [HIGH]
├── Russell Teter (SVP BD & Ops → COO-elect) [HIGH]
│   └── Clayton Coyne (Dir Partnerships & Channel) [HIGH]
├── Ed Miller (CRO; roster says "SVP BD & Strategy") [HIGH on role; MED on title currency]
│   ├── Daniel Hansen (Dir Sales — Corp/Gov) [HIGH]
│   ├── Massimo Gentili (VP International — EU) [HIGH]
│   ├── Sabina Cramer (SVP Collab Renewals — EU) [HIGH]
│   │   ├── Andee Bodenstein (Lead AM, US) [HIGH]
│   │   ├── Holly Hardin (AM/CSM, US) [HIGH — activity gap]
│   │   ├── Robert Thayer (AM, US) [HIGH — activity gap]
│   │   ├── Emmanuel Clemot (AM EMEA/MENA) [HIGH]
│   │   ├── Armanda Sereikaitė (AM/CSM LAC) [HIGH — see Nikolaos overlap]
│   │   ├── Nikolaos Galindo (AM EMEA per SF / "Channel AM LAC" per roster) [LOW — role unclear]
│   │   └── Jorge Salinas (Dir Global SE) [HIGH]
│   │       ├── Alan Lam (SE APAC) [HIGH]
│   │       └── Monica González (Impl + SE, MX) [HIGH]
│   ├── Kendall Woodard (Creative Director per SF / Sr Digital Designer per roster) [HIGH — title divergence]
│   ├── Roxana Nabavian (Marketing) [HIGH]
│   └── Dalton Mullins (Field Marketing Mgr per roster / SDR per SF) [HIGH — title divergence; runs 40K SF tasks = automation]
└── Scott Perian (Chief Architect per roster / SVP Product per leadership sheet) [HIGH on role]
    │ [14 direct reports — span-of-control flag]
    ├── Balwant Bisht (Staff SWE, US) [HIGH]
    ├── Gavin Llewellyn (Staff SWE, UK) [HIGH]
    ├── Gail Chua (Sr QA, CA) [HIGH]
    ├── Michal Marek (Staff SWE, CZ) [HIGH]
    ├── Bronek Gabrhelik (Staff SWE, CZ) [HIGH]
    ├── Ivo Novosad (Sr Mgr SW Eng, CZ — likely #2 eng) [HIGH]
    ├── Pavel Mican (Staff SWE, CZ) [HIGH]
    ├── Robin Wolny (Sr DevOps, CZ) [HIGH]
    ├── Jakub Samek (Sr SWE, CZ) [HIGH]
    ├── Marek Odraska (Sr Test Auto, CZ) [HIGH]
    ├── Jiri Stefek (Sr Test Auto, CZ) [HIGH]
    ├── Abhinav Khawarey (PM, IN — sole product manager) [HIGH]
    ├── Roksolana Bondarenko (QA, CZ) [HIGH]
    ├── Jan Mátl (Full Stack, CZ) [HIGH]
    └── Anthony Fabiani (L3 Support, US)
        └── Timma Wilson (Support, US) [HIGH]

[OFF-ROSTER but operationally real — see Section D]
├── Vivek (Marketing Ops / Integration Admin — Hubspot/Chorus/Ringlead/Wrike) [HIGH on existence; LOW on employment status]
├── Sales Operations Manager (Global Sales Ops — anonymized in SF as "Sales Operations") [HIGH on existence; LOW on identity]
├── 9 Manila BPO Call Center contractors (Franklin Lagare, Kate Nadonga, May Itliong, Sherwin Yalong, Catherine Grace, Ferdinand Buison, Ernest Mangalas, Johnalle Malones, Hanna Arinque) [HIGH]
├── Cristina Aguilar (Contractor - Support) [HIGH]
├── Tammy Secord (Contractor - Documentation) [HIGH]
└── CoSo (separate cap structure, reports to Jim Seaman)
    ├── AJ Gorton (Commercial Sales Manager) [HIGH]
    └── Ed Kwong (Controller) [HIGH]
    └── [11 unaccounted CoSo bodies — roster says "COSO (13)" but only 2 listed]
```

---

## B. Per-Person Profiles (43 named profiles)

### B.1 Executive (G&A / Management — 6 people)

**Michael Chasen — CEO** | $400K FL | US | [HIGH confidence]
- Founder/CEO posture; the "Chasen-Ed-Sabina-Scott axis" predates Russell's tenure. Decision authority on every redesign question; political reality is Russell drafts, Chasen ratifies.
- SF activity: minimal direct (no opps owned); board-facing.
- Load-bearing for: investor narrative, Holdco relationship, Barclays-by-proxy via Brian.
- Flight risk: PM-007 cataloged at 15% — "Chasen exits or is replaced before recap closes."
- Question mark for system: what's Russell's read on Chasen's actual exit horizon?

**Brian Bharwani — CFO** | $400K FL | US | [HIGH]
- Co-architect of cash defense with Russell. Owns the May 18 model methodology decision (DEC-003 — resolved-correct).
- Activity: not in customer-facing SF data; G&A only.
- Load-bearing for: NetSuite + Cash Lever Model + Barclays reporting.
- Flight risk: low — too deep in the workout to leave mid-stream.
- Question mark: alignment posture with Russell on redesign — peer-with or peer-skeptical?

**Russell Teter — SVP BD & Ops (COO-elect)** | $400K FL | US | [HIGH]
- Title is structurally undefined publicly. Owns WS-01 through WS-12 in practice.
- Direct report: Clayton Coyne only. De facto authority is wider.
- Load-bearing for: cash defense, COO transition, board narrative production, Locality-AI parallel track (private).
- Flight risk: walk-away leverage is doctrinal (POS-005), not a real flight signal.

**Nicole Brantley — VP of Accounting** | $276K FL | US | [HIGH]
- Reports to Brian. Pre-COO accounting leadership.
- SF activity: 0 (G&A function).
- Load-bearing for: month-end close, NetSuite GL accuracy, audit prep.
- Flight risk: low; G&A tends to be stable in turnaround.
- Question mark: capacity for the additional reporting cadence Barclays will demand if a covenant tripwire fires.

**Andy Prescott — Director of Revenue Accounting** | $225K FL | US | [HIGH]
- Reports to Brian. Owns rev rec.
- Load-bearing for: ASC 606 compliance, deferred revenue waterfall.
- Question mark: relationship with Sabina/Ed on bookings vs revenue classifications.

**Kyle Delaney — Revenue Manager** | $146K FL | US | [HIGH]
- Reports to Brian. Junior to Andy.
- Question mark: career trajectory and retention; lowest-FL G&A senior.

### B.2 Sales (4 named in roster)

**Ed Miller — CRO (roster title stale)** | $400K FL | US | [HIGH on role]
- The de facto operating chief of GTM today. Marketing, sales, renewals, CS all roll up to him.
- SF: 15 active open opps, $1.1M Contracting on one deal (the biggest single new-business pursuit at Class). 718 tasks in 90d = personal selling, not just management.
- Pre-existing political authority; Russell's COO transition narrows his span if redesigned.
- Flight risk: MEDIUM — sensitive to redesign signaling. PM not yet cataloged but worth a new PM-008.

**Daniel Hansen — Director of Sales, Corp/Gov** | $381K FL | US | [HIGH]
- Owns Corp/Gov new business solo. $1.9M qualified pipeline; 88 Discovery opps.
- 104 current customer accounts + 230 former customer accounts = 2.2:1 ratio = Corp/Gov leakage.
- Load-bearing for: new-logo Corp/Gov ARR pipeline.
- Flight risk: MEDIUM — comp is high vs SF data showing relatively limited recent closes; if frustrated with marketing-sourced pipeline quality, could exit.

**Massimo Gentili — VP of International (EU)** | $409K FL | EU | [HIGH]
- Largest territory: 381 customer accounts + 676 former + 82 partner resellers = 1,139 accounts. International "everything."
- SF: 53 opps last 180d, 20K tasks 90d, $815K Qualified Opp + $1M Evaluation = active machine.
- 12-week EU statutory severance (per CFO severance policy memory).
- Load-bearing for: ~40-50% of new-business EMEA pipeline AND historical EMEA customer relationships.
- Flight risk: LOW-MEDIUM. Highly engaged but expensive; comp expectations may pressure if redesign hints at title change.

**Clayton Coyne — Director, Partnerships & Channel** | $222K FL | US | [HIGH]
- Russell's only direct report on paper. 347 customer accounts + 695 former — large channel territory.
- SF: only 10 open opps ($112K). Pipeline is thin.
- 66 Events in 90d — actually quite active despite thin pipeline. Partnerships work doesn't always convert to direct opps.
- Load-bearing for: Carahsoft + reseller channel + K12 federal pull-through.
- Flight risk: LOW. Has Russell as direct manager. Quietly important.
- Question mark: ROI of partnerships investment vs direct sales — is this a "save the channel" or "consolidate to direct" function?

### B.3 Marketing (3 named in roster, but 1 functions differently than titled)

**Kendall Woodard — Creative Director (SF) / Sr Digital Designer (roster)** | $120K FL | US | [HIGH]
- TITLE DIVERGENCE is the loudest signal. SF says "Creative Director in Brand and Customer Marketing"; roster says "Senior Digital Designer." She's likely de facto head of marketing/brand.
- Reports to Ed Miller per roster.
- Activity in SF events: not visible (marketing function, not deal-touch).
- Load-bearing for: brand voice during this crisis. If she's not titled CMO/Head of Marketing, no one is.
- Flight risk: MEDIUM — under-titled relative to function is the classic flight setup.

**Roxana Nabavian — Marketing** | $100K FL | US | [HIGH]
- Reports to Ed. Title says "Marketing" generically.
- Demand gen vs brand: not visible from data. May overlap with Kendall.
- Severance: 4 weeks (per memory note — Roxana helps July if cut).
- Load-bearing for: unclear without clarification.
- Flight risk: LOW — appears stable.
- Question mark: actual function distinction from Kendall. Possible redundancy.

**Dalton Mullins — Field Marketing Manager (roster) / SDR (SF)** | $93K FL | EU | [HIGH on signal; MED on function]
- TITLE DIVERGENCE again. SF tagged him SDR. He runs 40,878 SF tasks in 90 days — pure cadence/automation work. That's not field marketing; that's marketing-ops orchestrated outbound.
- Reports to Ed.
- Load-bearing for: top-of-funnel outbound automation. If he leaves, the 40K-task funnel stops generating Discovery-stage opps for Daniel and Massimo.
- Flight risk: MEDIUM — EU comp ($93K FL) is low relative to the work volume he drives.

### B.4 Renewals (6 in roster, plus discovered Nikolaos)

**Sabina Cramer — SVP Collab Renewals (SF) / SVP Renewal Sales (roster)** | $409K FL | EU | [HIGH]
- Manages the renewal team. 41 qualified renewals herself, $1.4M $. Mostly manager-mode (no events logged, 157 tasks).
- 12-week EU statutory; expensive to lose AND expensive to part with.
- Pre-existing axis with Chasen.
- Load-bearing for: renewal team management.
- Flight risk: LOW-MEDIUM. Sensitive to Russell's COO authority if it absorbs CS/Renewals.

**Andee Bodenstein — Lead Account Manager (SF) / Account Manager NA (roster)** | $179K FL | US | [HIGH]
- 93 qualified renewals at $1.9M. 47 events 90d.
- "Lead" title in SF suggests senior on the team — possibly a player-coach.
- Load-bearing for: NA renewal book.
- Flight risk: LOW. Active and engaged.

**Holly Hardin — Customer Success Manager (roster) / Account Manager (SF)** | $142K FL | US | [HIGH on identity, LOW on actual status]
- 39 qualified renewals at $1.3M. ZERO events logged in 90d. 29 tasks total.
- The single most concerning activity-vs-book ratio.
- Title in SF history shows older record as "Customer Success Manager in Domestic Sales" — possible role transition.
- Load-bearing for: $1.3M renewal book.
- **FLIGHT RISK: HIGH or DISENGAGED — diagnostic conversation required.**

**Robert Thayer — Account Manager** | $156K FL | US | [HIGH on identity, MEDIUM on activity]
- 125 qualified renewals at $2.7M. Only 20 events in 90d. 183 tasks.
- Activity-vs-book ratio is the second worst on the team.
- Still logging into SF daily (last login 2026-05-21).
- Load-bearing for: $2.7M renewal book.
- **FLIGHT RISK: MEDIUM-HIGH — diagnostic conversation required.**

**Emmanuel Clemot — Account Manager EMEA / Channel AM MENA (roster)** | $133K FL | EU | [HIGH]
- THE LOAD-BEARING RENEWAL REP. 80 qualified renewals at $4.15M (largest $); 149 events in 90d (heaviest customer touch); $293K in Contracting stage; runs the EMEA/MENA renewal book.
- $4.15M = ~12% of ARR sitting with one IC.
- Comp $133K FL on $4.15M renewal $ = 31:1 ratio = best efficiency on team.
- Load-bearing for: EMEA renewal motion.
- **FLIGHT RISK: MEDIUM** — comp is under-market relative to book size. Lift-out by competitor is real risk.

**Armanda Sereikaitė — AM/CSM LAC** | $80K FL | Intl | [MED — overlap with Nikolaos unclear]
- Listed in roster as LAC AM/CSM.
- Not visible in SF top-active reports. Possibly recently transitioned.
- Question mark: does she still own the LAC book, or did Nikolaos absorb it?

**Nikolaos Galindo — NOT IN ROSTER; SF says "Account Manager - EMEA" / Roster's 2nd sheet says "Channel AM LAC"** | comp unknown | likely EU | [LOW confidence on role; HIGH on importance]
- 136 qualified renewals at $3.7M — the largest count on the team.
- Hired after 3/19/2026 OR contractor/Holdco resource.
- Title contradiction: SF says EMEA AM, roster says LAC. He could be one of those who shifted books.
- **Load-bearing AND a question mark: highest-volume renewal manager whose comp, status, and territory are all unclear.**
- **FLIGHT RISK: UNKNOWN — diagnostic priority for Russell.**

### B.5 Customer Success (3 in roster)

**Jorge Salinas — Director of Global Solutions Engineering** | $191K FL | US | [HIGH]
- Reports to Sabina (not directly to a CS executive).
- Manages 2 SEs (Alan Lam APAC, Monica MX).
- Load-bearing for: technical implementation + pre-sales technical support.
- Flight risk: LOW-MEDIUM.
- Question mark: how much of customer onboarding rides on him personally.

**Alan Lam — Solutions Engineer APAC** | $134K FL | APAC | [HIGH]
- Reports to Sabina (via Jorge org but SF shows Sabina direct?). Actually roster has him reporting to Sabina directly.
- APAC technical coverage.
- Flight risk: LOW.

**Monica González De la Garza — Impl Mgr & SE** | $91K FL | MX | [HIGH]
- Reports to Jorge. MX-based.
- Load-bearing for: LATAM technical/implementation coverage.
- Flight risk: LOW.

### B.6 Product (15 in roster)

**Scott Perian — Chief Architect (roster) / SVP Product (leadership sheet)** | $266K FL | US | [HIGH]
- 14 direct reports, no #2 named publicly.
- THE SINGLE POINT OF FAILURE — PM-003 probability is understated.
- Load-bearing for: literally all product velocity at Class.
- **FLIGHT RISK: HIGH IF NOT RETAINED.** No published succession means his loss = product roadmap stops.

**Ivo Novosad — Sr Manager Software Engineering** | $112K FL | CZ | [HIGH — likely de facto #2 eng]
- The most senior engineering management title under Scott.
- Created Slack channel #class-prod-scaling — visibility into production work.
- **Load-bearing potential AS Scott's #2 — but is he actually in that role today, or is the title aspirational?**

**Engineering staff (13 individual engineers/QA/PM)** — All [HIGH] on identity, [MEDIUM] on individual differentiation
- Balwant Bisht (Staff SWE, US, $178K FL)
- Gavin Llewellyn (Staff SWE, UK, $205K FL — UK statutory protected)
- Gail Chua (Sr QA, CA, $108K FL)
- Michal Marek (Staff SWE, CZ, $131K FL)
- Bronek Gabrhelik (Staff SWE, CZ, $129K FL)
- Pavel Mican (Staff SWE, CZ, $102K FL)
- Robin Wolny (Sr DevOps, CZ, $87K FL) — DevOps SPOF? Worth flagging.
- Jakub Samek (Sr SWE, CZ, $75K FL) — created Slack #class-for-teams-deployments + #class-ui
- Marek Odraska (Sr Test Auto, CZ, $72K FL)
- Jiri Stefek (Sr Test Auto, CZ, $66K FL) — created #e2e-class-nightly-results
- Abhinav Khawarey (PM, IN, $60K FL) — **SOLE PRODUCT MANAGER for the entire product line. Single point of failure for product planning.**
- Roksolana Bondarenko (QA, CZ, $55K FL)
- Jan Mátl (Full Stack, CZ, $47K FL)

### B.7 Support (2 in roster)

**Anthony Fabiani — L3 Client Support Engineer** | $130K FL | US | [HIGH]
- Reports to Scott (not separate support function).
- Manages Timma.
- 90 SF tasks in 90d, 1 event = real customer-touch but light.
- Load-bearing for: escalations.

**Timma Wilson — Client Support Engineer** | $100K FL | US | [HIGH]
- Reports to Anthony.
- 30 SF tasks. Quiet but active.

### B.8 CoSo (2 named in roster, 11 unaccounted from "(13)" header)

**AJ Gorton — Commercial Sales Manager (CoSo)** | $302K FL | US | [HIGH]
- Reports to Jim Seaman (CoSo CEO, not in this roster).
- $302K FL is high — includes commissions per memory note.
- Load-bearing for: CoSo commercial sales motion (separate cap structure).

**Ed Kwong — Controller (CoSo)** | $222K FL | US | [HIGH]
- Reports to Jim Seaman.
- Finance side of CoSo.

**[11 unaccounted CoSo bodies]** — [LOW] — roster header references "(13)" but only 2 listed. Worth knowing what's there.

---

## C. Activity-vs-Book Map (the key WS-03 signal)

| Person | Renewal $ owned | SF Events 90d | SF Tasks 90d | Activity grade |
|---|---:|---:|---:|---|
| Emmanuel Clemot | $4.15M | 149 | 3,957 | A+ (load-bearing) |
| Nikolaos Galindo | $3.7M | — | 22 | ? (UNKNOWN — flag for diagnostic) |
| Robert Thayer | $2.7M | 20 | 183 | C- (activity gap) |
| Andee Bodenstein | $1.9M | 47 | 447 | B (active) |
| Sabina Cramer | $1.4M | — | 157 | manager-mode |
| Holly Hardin | $1.3M | 0 | 29 | F (activity gap — disengagement risk) |
| Massimo Gentili (new biz) | $1.5M qual opp + $1M eval | — | 20,181 | A+ (machine) |
| Daniel Hansen (new biz) | $1.9M qual opp | 78 | 8,965 | A (active outbound) |
| Clayton Coyne | $112K open | 66 | 58 | B (light direct pipeline, real touch volume) |
| Dalton Mullins | (no opps) | 49 | 40,878 | automation-grade |

---

## D. Off-Roster Operational Footprint (the institutional reality)

| Entity | Role | Visibility | Why it matters |
|---|---|---|---|
| Vivek (no last name in data) | Marketing Ops / Integration admin (Hubspot, Chorus, Ringlead, Wrike) | App Admin SF user description | Owns the entire GTM tech stack data flow. If he exits, marketing ops collapses. Status (W-2 / 1099 / BPO) unknown. |
| Sales Operations Manager | Global Sales Operations | "Sales Operations" SF user, super admin | Sales process owner. SF infrastructure. Identity anonymized. |
| Manila BPO Call Center (~9 contractors) | Outbound SDR / Discovery cadence support | Salesforce user list, "Call Center" role | Drives ~50,000 SF tasks/quarter. Fuels Discovery-stage pipeline for Daniel + Massimo. AP/BPO billing rather than payroll — deferrable but fragile. |
| Cristina Aguilar | Contractor - Support | SF user | L1.5 support coverage. Probably offshore. |
| Tammy Secord | Contractor - Documentation | SF user | Documentation/knowledge base work. |
| CoSo "11 missing" | Unknown | Roster header reference | Could be engineers, support, sales — unknown until clarified. |
| Anthology/Holdco shared resources (Travis Bullock, Tess Frazier, Scarlet DeSaavedra, Sohel Shah, Kris Stokking, Shawn Edstrom, Robert Jongbloed, Tomas Paseka) | Possibly shared infrastructure/ops | Slack channel creators | If Class operates on shared services with another Holdco entity, those resources can be pulled back at any time. |

---

## E. Structural observations (the team-I-have vs team-I-need preview)

1. **The 41-headcount story the board hears is a 50-60-body operational reality.** True census includes BPO + Vivek + Sales Ops + CoSo extras + possible Holdco shared resources. Any redesign narrative that ignores the off-roster footprint is incomplete.

2. **Marketing is structurally under-invested AND organizationally buried.** 3 heads + Dalton-as-SDR-not-marketer = 2 real marketers. SaaS benchmark for healthy mature is ~2 per $1M ARR; Class is at ~0.06. Brand drift is inevitable without an explicit CMO/Head of Marketing role.

3. **Customer Success rolls up under Renewals rolls up under CRO.** Retention has no C-table sponsor distinct from sales. POS-004 (Intl HED concentration risk) doesn't have a dedicated executive owner.

4. **Scott Perian is the single biggest individual risk on the company.** No #2 published. 14 directs. Cash crisis context = retention conversation overdue. Ivo Novosad is the most likely candidate to elevate. Abhinav (sole PM) is a secondary product-management SPOF.

5. **The renewal book concentration creates 4 named flight-risk surfaces:** Emmanuel (largest $, under-comped), Nikolaos (largest count, role/title/comp opacity), Robert (activity gap), Holly (severe activity gap).

6. **Dalton's "Field Marketing Manager" title vs SDR-grade automation activity is the loudest title-vs-reality divergence on the team.** Either his role evolved or the roster title is stale.

7. **Russell's mandate is invisible.** Listed as SVP BD & Ops with one direct report. The COO seat must be named publicly before WS-03 can land.

8. **The 4 US C-suite execs at $400K each = $1.6M of FL on the lowest-individually-measurable-revenue contribution.** This is the highest-FL/lowest-direct-impact concentration on the org chart and the most politically-charged set of decisions in any redesign.

9. **CoSo's 11 missing bodies are a planning blind spot.** Until that's reconciled, any "consolidation under Russell" Option 1 design risks discovering CoSo footprint Russell didn't know about.

10. **Czech statutory 5-month notice on 11 engineers is the binding constraint on any engineering reduction.** Cuts there are slow AND expensive — they likely shouldn't be on the table at all in a turnaround. The Czech bench is the cheapest engineering capacity per $ in the company.

---

## F. Named Question Marks (where the system is most uncertain)

1. **Nikolaos Galindo's actual role, territory, employment status, and comp** — runs the largest renewal book by count, off-roster, title divergence between SF and roster sheet 2.
2. **Vivek's last name, employment status, and what happens to marketing-ops if he exits.**
3. **The Sales Operations Manager's identity** — anonymized in SF; possibly a recent hire or contractor.
4. **Robert Thayer's actual status** — activity gap could be channel shift OR disengagement.
5. **Holly Hardin's actual status** — same diagnostic question, more acute.
6. **The 11 unaccounted CoSo bodies.**
7. **Anthology/Holdco shared resource status** — Travis, Tess, Scarlet, etc. — are these Class people, former Class people, or borrowed from another Holdco entity?
8. **Roxana vs Kendall functional overlap.**
9. **Armanda's LAC role given Nikolaos appears to overlap her territory.**
10. **Ed Miller's actual willingness to absorb a narrowed CRO scope under a Russell COO model.**
11. **Whether Ivo Novosad is genuinely Scott's #2 today or just titled that way.**
12. **Abhinav Khawarey's product-management capacity as sole PM** — does he actually steer roadmap or just operate tickets?
13. **The cause of Class's 1,607 Former Customer count** — is the churn concentrated in any one segment/AM, or distributed?
14. **Daniel Hansen's read on Corp/Gov pipeline quality** — 230 former to 104 current customer ratio is the worst on the team.
15. **What "load-bearing" means for the 4 US execs at $400K each beyond their nominal titles** — what does each ACTUALLY do day-to-day.

---

## G. Confidence summary

- **HIGH confidence per-person profiles:** 27 of 41 roster employees + AJ Gorton + Ed Kwong = 29.
- **MEDIUM confidence:** 8 of 41 (where title-vs-function divergence is real but readable from data).
- **LOW confidence:** 4 of 41 (where roster is the only source and SF activity adds nothing).
- **Off-roster names tracked as separate question marks:** Nikolaos, Vivek, Sales Ops Mgr, Manila BPO group (9), Cristina, Tammy, plus 8 possibly-Anthology/Holdco names.

