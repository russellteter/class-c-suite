# SFDC Account_Manager__c Cleanup — Handoff to Sabina + Kate Bertram

**Owner:** Sabina Cramer + Kate Bertram (SF Ops)
**Source:** SFDC audit 2026-05-26 against Master Renewal Playbook canonical AM list
**Surfaced via:** /deep class-gtm-strategy-2026 + Russell direct confirmation of departures

## What this is

**84 active Accounts in Salesforce have a TERMINATED employee assigned as `Account_Manager__c`.** The accounts have effectively been worked / reassigned in the Master Renewal Playbook, but SFDC was never updated to reflect the reassignment. This means any SF report that aggregates by Account_Manager__c is misattributing book to people who haven't been at Class for months.

## The 6 terminated reps with stale assignments

| Terminated rep | Stale Account_Manager__c assignments | Geo cluster |
|---|---|---|
| **Fiona Ong** | 28 accounts | APAC + India (excludes ANZ — ANZ already cleaned up to Sabina) |
| **Petya Lolova** | 22 accounts | UK + EU (heaviest in UK) |
| **Armanda Sereikaite** | 21 accounts | LAC + Spain |
| **Simon Patanjo** | 10 accounts | US + Canada |
| **Monica Gonzalez De la Garza** | 2 accounts | LAC (Brazil + DR) |
| **Russell Teter (inactive duplicate User)** | 1 account | Canada (Docebo vendor record) |

## How to use the CSV

The companion file `sfdc_stale_am_cleanup_list.csv` has all 84 accounts with:
- Account Name + Country + Type + current (stale) AM + current AE Owner + ICP segment
- **Priority column:** HIGH (active Customer), MED (Partner Reseller / vendor), LOW (Former Customer / Prospect)
- **Suggested New Account_Manager:** based on geo + active AMs in playbook
  - EMEA / UK / Africa / MENA → **Emmanuel Clemot**
  - LAC / Brazil / Mexico / Chile / Argentina → **Nikolaos Galindo**
  - APAC / India / Japan / Korea / HK / SG / MY / Philippines → **Sabina Cramer (interim)**
  - US/Canada → flagged TBD with current AE.Owner for routing (Robert Thayer / Andee Bodenstein / Holly Hardin per US territory split)

## Priority breakdown

- **HIGH (Customer):** 1 account — **City College Norwich (UK)** — assigned to Petya. Confirm renewal coverage immediately, reassign to Emmanuel.
- **MED (Partner Reseller / vendor):** ~9 accounts — channel relationship records.
- **LOW (Former Customer / Prospect):** ~74 accounts — hygiene cleanup, not active book risk.

## Process recommendation

1. **Sabina reviews suggested AM mapping** in the CSV — adjusts based on actual coverage decisions for any US/Canada accounts she sees differently
2. **Kate Bertram bulk-updates SF** via Data Loader or List View inline edit on Account_Manager__c
3. **City College Norwich gets immediate attention** — Sabina confirms with Emmanuel he can pick it up
4. **The 10 Simon Patanjo accounts** (all Former Customer US/Canada) — confirm Russell's view on whether any are worth a winback push
5. **Russell Teter inactive duplicate User** — Kate raises with SF admin to merge or deactivate the ghost User record (separate cleanup task, affects 1 AM assignment + 25 Owner assignments)

## Why this matters operationally

While only 1 of the 84 is an active Customer (City College Norwich), the hygiene issue propagates downstream: every renewal-aging report, every territory analysis, every Owner-based AR aging, and any future SF Owner.Name aggregate that doesn't filter `User.IsActive = TRUE` will pull these names into the working data. Cleanup now prevents a long tail of "why is Petya in this report" follow-ups across the team.

## Canonical going forward

The Master Renewal Playbook ("Collab/Class 2026" tab) is the source of truth for live AM assignments. SFDC's `Account_Manager__c` should match the playbook. When a rep is terminated, the cleanup workflow is:
1. Add to `class_gtm_roster.md` CANONICAL TERMINATED REPS list
2. Pull all `Account_Manager__c = <terminated rep>` from SFDC
3. Reassign per playbook (or per Sabina's call)
4. Confirm `User.IsActive = FALSE` on the SF User record (HR usually triggers this on offboarding)
