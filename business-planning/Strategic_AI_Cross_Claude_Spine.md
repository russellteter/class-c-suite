# Strategic AI — Cross-Claude Knowledge Spine

**Companion to:** `Strategic_AI_Operating_Model_v2.md`
**Purpose:** Full design of the cross-Claude knowledge spine — how the system becomes aware of every prior project, session, memory, file, and company data surface, and how Slack/Gmail/Drive get continuously ingested rather than searched ad-hoc.

---

## Part 1: The Knowledge Inventory

The spine begins with a single master index that Claude reads at the start of every session. It catalogs every knowledge surface Russell has, organized by domain, with explicit refresh cadences and cross-links.

**File:** `/Users/russellteter/Documents/Claude/Projects/_spine/INVENTORY.md`

### Domain A: Class Technologies (active, daily)

| Source | Location | Contains | Tool | Cadence | Cross-links |
|---|---|---|---|---|---|
| Class memories | `.../spaces/957d1ceb.../memory/` | 16+ memory files: debt, cash, GTM, COO leverage, strategic AI operating model | Filesystem Read | Live | → Apply (personal finance), Locality (time allocation) |
| Cash model v5 | `Business Planning/Class_Cash_Lever_Model_v5_2026-05-18.xlsx` | Per-person severance, AWS, AR/AP levers | Filesystem | Static (versioned) | → Finance cash forecast XLSX |
| Finance forecast | Drive: `Class Finance / Weekly Cash Forecast` | Authoritative weekly baseline | `mcp__Google_Workspace_MCP__search_drive_files` | Weekly (Fri) | → Cash model v5, Board deck |
| Board deck | Drive: `Class Board / 2026 Q2` | Slide 16 = trough narrative | Google Drive MCP | Per-meeting | → Cash model, GTM roster |
| NetSuite | NS instance | GL, AP, AR, customer/vendor masters | `ns_runCustomSuiteQL` | Live | → Finance forecast (truth source) |
| Salesforce | SFDC org | Pipeline, accounts, contacts | `mcp__salesforce__query` | Live | → Identity graph (people) |
| AWS billing | `class` + `collab` profiles | Cost & usage by service | `mcp__AWS_API_MCP_Server__call_aws` | Daily | → Cash model AWS tab |
| Class Slack | Slack workspace | Decisions, exec channels | `slack_search_public_and_private` | Continuous (see Part 3) | → Identity graph, Class memories |
| Class Gmail | `russell.teter@classedu.com` | Board comms, vendor notices, customer escalations | Gmail MCP | Daily 6am | → Identity graph |
| Class Drive | Shared drives + My Drive `Class/` | Contracts, board materials, models | Drive MCP | Daily diff scan | → All Class workstreams |

### Domain B: Apply Campaign (parallel, weekly cadence)

| Source | Location | Contains | Tool | Cadence |
|---|---|---|---|---|
| Apply project | `/Documents/Claude/Projects/Apply/` | Resumes, role tracker, target list | Filesystem | Live |
| `apply-to-role` skill outputs | Apply KB | Per-role artifacts | Skill | On-demand |
| Apply Gmail label | Gmail label `Apply/` | Recruiter threads | Gmail MCP | Daily 6am |

### Domain C: Locality AI (side business, weekly)

| Source | Location | Contains | Tool | Cadence |
|---|---|---|---|---|
| Locality project | `/Documents/Claude/Projects/Locality/` | Website source, agreements, invoicing | Filesystem | Live |
| Locality Drive | Drive: `Locality AI/` | Contracts, brand docs | Drive MCP | Weekly |
| `locality-*` skills | Skill registry | Brand voice, invoicing, agreements | Skill | On-demand |

### Domain D: Cross-cutting / Personal

| Source | Location | Contains | Tool | Cadence |
|---|---|---|---|---|
| Cowork session transcripts | `mcp__session_info__list_sessions` | Every prior session | session_info MCP | Per-session-close ingestion |
| Auto-memory (this space) | `.../memory/MEMORY.md` | Top-level memory index | Filesystem | Live |
| Calendar | Google Calendar | Meetings, prep cycles | Calendar MCP | Live |

The INVENTORY.md file is regenerated nightly by scheduled task `spine.inventory.refresh`.

---

## Part 2: Cross-Project Memory Bridging

Memory files get a project prefix in frontmatter:

```yaml
---
project: class
domain: comp-negotiation
visibility: cross-project  # or "private"
tags: [russell-personal, equity, mip]
links:
  - apply::comp-floor
  - locality::time-allocation
last_updated: 2026-05-21
---
```

`visibility: cross-project` means other project Claudes can read this when their query touches the linked domain. `visibility: private` means the memory is only loaded in that project context.

### The Consolidated Index

`/Users/russellteter/Documents/Claude/Projects/_spine/MEMORY_INDEX.md` — read by every Claude session at startup. Structure:

```markdown
# Russell's Master Memory Index

## class
- class::cash-trough-july → [path] → tags: [board, cash, urgent]
- class::coo-leverage → [path] → tags: [russell-personal, comp]
  - LINKS TO: apply::comp-floor, locality::time-allocation

## apply
- apply::comp-floor → [path] → tags: [russell-personal, comp]
  - PULLS FROM: class::coo-leverage, russell::newco-equity-stack

## locality
- locality::time-allocation → [path] → tags: [russell-personal, capacity]

## russell (personal, shared across all)
- russell::newco-equity-stack → [path]
- russell::cash-position → [path]
```

### Conflict Resolution

When two projects have overlapping facts:
1. **Authority hierarchy:** `russell::` memories override project-specific claims on personal facts.
2. **Timestamp wins** for operational facts (most recent canonical).
3. **Explicit conflict file** at `_spine/CONFLICTS.md` flags unresolved tensions. Weekly scheduled scan writes conflicts here.

---

## Part 3: Continuous Ingestion of Slack / Gmail / Drive

### What gets ingested

**Slack — channels worth indexing:**
- `#exec`, `#board-prep`, `#finance`, `#cash`, `#cust-escalations`, `#barclays-comms`
- All DMs with Chasen, CFO, board observers
- Skip: `#random`, social channels

**Gmail — labels worth indexing:**
- `Board/`, `Barclays/`, `Customers/`, `Apply/`, `Locality/Clients/`
- All threads from `*@barclays.com`, `*@class-board-domain`
- Skip: newsletters, calendar invites, marketing

**Drive — folders worth watching:**
- `Class/Board/`, `Class/Finance/`, `Class/Legal/`, `Locality/Clients/`, `Apply/Roles/`

### Extraction Schema

Every ingestion pass appends JSON-Lines to `_spine/intelligence/YYYY-MM-DD.jsonl`:

```json
{
  "ts": "2026-05-21T14:32:00Z",
  "source": "slack|gmail|drive",
  "source_id": "slack:C0123:p1234567890",
  "channel_or_label": "#exec",
  "participants": ["chasen", "russell", "cfo"],
  "type": "decision|commitment|risk|signal|customer_event|competitor_event",
  "summary": "Chasen approved AWS reserved instance purchase pending Russell review",
  "entities": ["aws", "chasen", "russell"],
  "links_to": ["class::aws-deepdive", "class::cash-trough-july"],
  "raw_pointer": "slack://message_url"
}
```

This is the durable, replayable record. Memories and artifacts are derived from it.

### Watermarks

`_spine/watermarks/slack.json`, `gmail.json`, `drive.json`. Store highest-seen timestamp/messageId/revisionId per channel/label/folder. Every ingestion job reads watermarks, fetches deltas only, writes new JSONL, then advances watermark atomically.

### Scheduled Tasks

```yaml
# spine.gmail.morning — daily 6am ET
For each label in [Board, Barclays, Customers, Apply, Locality/Clients]:
  fetch threads since watermark
  for each new message: extract {decisions, commitments, risks, signals}
  append to _spine/intelligence/{date}.jsonl
  update watermark
Write _spine/digests/gmail-{date}.md summarizing top 10 items

# spine.slack.decisions — Sunday 6pm
For each channel in priority list:
  fetch messages since watermark
  extract decisions and commitments (LLM pass)
  cross-reference participants → identity graph
Write _spine/digests/slack-week-{date}.md

# spine.slack.exec.hourly — business hours, Mon-Fri 9-18 ET
channels: [#exec, #cash, #barclays-comms]

# spine.drive.diff — daily 7am
For each watched folder:
  list files modified since watermark
  for each: extract type, owner, summary, link to entity
Write _spine/digests/drive-{date}.md
```

### Surfacing "what's new"

Two artifacts get refreshed automatically:
1. `_spine/digests/daily-{date}.md` — single 1-page rollup combining Gmail morning + overnight Slack + Drive diff. Russell reads this with coffee.
2. The Knowledge Spine Cowork artifact (Part 6) pins the last 7 days of high-priority intelligence.

---

## Part 4: Session Transcript Indexing

### The Session Ledger

`_spine/SESSION_LEDGER.md`:

```markdown
# Session Ledger

## 2026-05-21 — Strategic AI Operating Model Hardening v2
- session_id: f2ae62ca-b383-...
- duration: ~2h
- topic: cross-claude knowledge spine, conviction backbone, stakeholder/workstream/adversarial layers
- key_conclusions:
  - Adopted project:: namespace for memory bridging
  - Identity graph file format finalized
  - Conviction backbone = positions + decisions + calibration + pre-mortems
- files_produced:
  - Strategic_AI_Operating_Model_v2.md
  - Strategic_AI_Cross_Claude_Spine.md
  - turnaround_operating_library.md
  - Strategic_AI_Conviction_Backbone.md
  - Strategic_AI_Stakeholder_Workstream_Adversarial.md
- related_prior_sessions: [2026-05-21-strategic-ai-v1, 2026-05-18-cash-lever-v5]
- next_actions:
  - Day One bootstrap v2 sequence
```

### Ingestion job

```yaml
# spine.session.close — trigger: on_session_end OR daily 11pm sweep
For each session in mcp__session_info__list_sessions since last sweep:
  read_transcript(session_id)
  LLM extract: topic, duration, conclusions, files_produced, related_prior_sessions
  append entry to SESSION_LEDGER.md
  update _spine/watermarks/sessions.json
```

### Pass 1 integration

Every `/deep` Pass 1 now runs:
1. Read SESSION_LEDGER.md
2. Grep for current query's entities and keywords
3. If matches found, surface: *"We discussed X on YYYY-MM-DD and concluded Z. Continue from there?"*

The "have we discussed this before?" reflex prevents redundant work and prevents contradicting prior analysis.

---

## Part 5: The Identity Resolution Layer

### Schema

`_spine/identities/{canonical_id}.md`:

```yaml
---
canonical_id: chasen
type: person
canonical_name: Chasen [LASTNAME]
role_at_class: CEO
role_relationships:
  - russell: reports-to (current); negotiating-counterparty (COO talks)
aliases:
  emails: ["chasen@classedu.com", "chasen@class-holdco.com"]
  slack_ids: ["U01ABCXYZ"]
  salesforce_user_id: "005XX..."
  netsuite_employee_id: "EMP-0023"
  drive_owner_ids: ["1abc..."]
primary_system_of_record: gmail
recent_activity:
  - 2026-05-20: slack #exec — approved AWS RI purchase pending review
  - 2026-05-18: gmail thread re: board prep, Barclays covenant
  - 2026-05-15: drive — edited "Holdco Cap Table v3"
sensitivity: HIGH
notes_pointer: class::coo-leverage
---
```

### Anchor identities to seed at bootstrap

```
_spine/identities/chasen.md          (person, CEO)
_spine/identities/class.md           (company, op sub)
_spine/identities/holdco.md          (entity, parent)
_spine/identities/barclays.md        (vendor-creditor)
_spine/identities/russell-self.md    (person)
_spine/identities/cust-{slug}.md     (one per top customer — start with template)
_spine/identities/comp-{slug}.md     (competitors)
```

### Auto-discovery

Ingestion jobs encountering unknown emails/Slack IDs write stubs to `_spine/identities/_pending/`. Weekly Russell-review surfaces for canonicalization or dismissal.

### Query pattern

When a `/deep` query mentions "Chasen," Claude resolves to `canonical_id: chasen`, then pulls the union of: Gmail threads (via alias emails), Slack messages (via alias IDs), Salesforce activity (via user ID), Drive edits (via owner IDs). All tagged with the same canonical ID.

---

## Part 6: The Master Knowledge Spine Artifact

Live Cowork artifact "Russell's Knowledge Spine." Layout zones:

```
+---------------------------------------------------------------+
|  RUSSELL'S KNOWLEDGE SPINE              Updated: 2026-05-21   |
+---------------------------------------------------------------+
|  [ TODAY'S DIGEST ]                                           |
|  Gmail morning (7 new, 2 urgent)                              |
|  Slack overnight (12 decisions, 1 commitment)                 |
|  Drive diffs (4 modified, Board v4 edited)                    |
|                                                               |
|  [ ACTIVE PROJECTS ]                                          |
|  - class    [16 memories] [12 recent sessions]                |
|  - apply    [4 memories]  [3 recent sessions]                 |
|  - locality [6 memories]  [2 recent sessions]                 |
|                                                               |
|  [ TOP IDENTITIES THIS WEEK ]                                 |
|  chasen (5 touches) | barclays (3) | cust-acme (2)            |
|                                                               |
|  [ INTELLIGENCE STREAM ]                                      |
|  14:32 Slack #exec: Chasen approved AWS RI                    |
|  11:05 Gmail Board: Q2 deck v4 distributed                    |
|  09:14 Drive: Holdco cap table v3 edited by chasen            |
|  ...                                                          |
|                                                               |
|  [ CONFLICTS NEEDING ARBITRATION ]                            |
|  class:: vs locality:: time allocation (since 5/14)           |
|                                                               |
|  [ INGESTION HEALTH ]                                         |
|  gmail watermark: 6:01 today | slack: 17:58 yesterday         |
|  drive: 7:00 today | sessions: 23:01 yesterday                |
+---------------------------------------------------------------+
```

### Click-through

- Digest cards → `_spine/digests/{source}-{date}.md`
- Active Projects → that project's MEMORY_INDEX.md slice
- Top Identities → `_spine/identities/{canonical_id}.md`
- Intelligence Stream → raw pointer (Slack URL, Gmail thread, Drive file)
- Conflicts → `_spine/CONFLICTS.md`
- Session Ledger entry → `read_transcript`
- Ingestion Health → watermark file; red if stale beyond cadence

### Refresh

Every scheduled ingestion task finishes by calling `mcp__cowork__update_artifact` with the freshly composed dashboard markdown. Artifact ID stable, stored at `_spine/artifact_id.txt`. Dashboard never goes stale.

---

## Bootstrap Sequence

1. Create `_spine/` directory structure (`intelligence/`, `digests/`, `identities/`, `watermarks/`).
2. Generate initial INVENTORY.md, MEMORY_INDEX.md, SESSION_LEDGER.md, CONFLICTS.md.
3. Write six core identity files.
4. Register the five scheduled ingestion tasks.
5. Create the Cowork artifact and store its ID.
6. One-time backfill: ingest last 30 days of Slack/Gmail/Drive.
7. Run session-close job once across all prior sessions to populate ledger.

After bootstrap, every new Claude session starts by reading INVENTORY.md + MEMORY_INDEX.md + the latest daily digest. Russell never has to tell Claude what exists. The spine knows.
