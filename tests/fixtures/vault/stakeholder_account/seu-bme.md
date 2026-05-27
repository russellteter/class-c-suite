---
account_id: 0018a00001tNqFuAAK
account_name: BME - Saudi Electronics University - eSaudi National Deal
short_name: SEU/BME
segment: International - Higher Ed
territory: EMEA - Middle East
location: Riyadh, Saudi Arabia
customer_type: Collab (Product Migration to Class attempted and Closed Lost in 2024)
total_contacts: 35
account_owner: Massimo Gentili
current_opp_owner: Emmanuel Clemot
mediated_through: BME (partner/reseller — prime contractor)
class_share_of_arr: ~10.1% of $20.57M FY27 ARR base
last_updated: 2026-05-26
linked_pre-mortems: [PM-014]
linked_tripwires: [TW-FIN-004]
linked_positions: [POS-012, POS-014, POS-015, POS-017]
linked_workstreams: [WS-02, WS-09]
sensitivity: HIGH
---

## Why this file exists
SEU is Class's single largest customer by ARR concentration as of 2026-05-26 (TW-FIN-004 fired RED). The account is structurally important enough that it deserves its own stakeholder file rather than living implicitly in the SF data. This is the first file in `stakeholders/customers-top-arr/` and the directory is created on 2026-05-26 as part of the tripwire firing remediation.

## Opportunity history (chronological)
| Close date | Type | Amount | Stage | Owner | Notes |
|---|---|---|---|---|---|
| 2024-08-15 | Renewal | $3,714,286 | Closed Won | Massimo | First major renewal in Massimo's BoB |
| 2024-10-29 | Product Migration | null | **Closed Lost** | Massimo | **CHURN SIGNAL**: SEU declined to migrate from Collab platform to Class |
| 2024-10-30 | Expansion | $450,000 | Closed Won | Massimo | NEW 1x Storage 2024-25 RFP |
| 2025-06-25 | Renewal | $1,333,333 | Closed Won | Massimo | 2025-2026 Renewal RFP. Materially smaller than prior renewal |
| 2025-06-25 | Expansion | $749,999 | Closed Won | Massimo | Class Upgrade & Services |
| **2026-07-15** | **Renewal** | **$2,125,000** | **Qualified Renewal** | **Emmanuel Clemot** | **OPEN — 51 days from authoring. "Year 2 of 3 Renewal"** |

TTM closed-won = $750K + $1.33M = $2.08M. Per Monday tripwire scan: 10.1% concentration.

## Structural observations
1. **Customer chose to stay on Collab.** The 2024 Product Migration loss is the most material historical signal in the record. SEU has actively declined to follow Class's platform roadmap. The renewal narrative cannot include any "we're moving you to Class" framing.
2. **Multi-year cadence with year-over-year volatility.** $3.71M (2024) → $1.33M (2025, 64% downsize) → $2.13M (2026 anticipated). The 2025 renewal was structurally a step-down. Whether the 2026 $2.13M reflects pre-negotiated multi-year structure or a real customer-side commitment is the open question for Russell.
3. **Account owner is Massimo; opp owner is Emmanuel.** Class's INTL Cornered Resource per POS-014 is exactly Emmanuel + Niko. Both load-bearing AMs are now committed to the most concentrated renewal. Single point of failure.
4. **Mediated through BME.** Class lacks direct contractual relationship; BME's incentive structure determines whether the deal gets defended. BME's margin on the deal is a variable Class does not control.
5. **Saudi government context.** SEU is technically a Higher Ed institution but operates with national-deal framing ("eSaudi National Deal"). Decisions are politically mediated. Vision 2030 policy direction could shift the customer's platform preferences independent of Class's actions.

## Current state (as of 2026-05-26)
- Renewal opp `006PC00000Ml5UFYAZ` at Qualified Renewal stage
- 35 contacts in SF — broad relationship
- No active Chorus pull yet on the account specifically (Sunday renewal-and-calls task will refresh)
- Russell has NOT yet had a direct executive sponsor touch with SEU principal or BME executive sponsor (per PM-014 mitigation step 1, this should land THIS WEEK)

## Action items (per PM-014 mitigation sequence)
1. **THIS WEEK — Russell:** Schedule 30-min exec sponsor call with SEU principal + BME executive sponsor. Russell or Chasen on the call, not Emmanuel alone.
2. **THIS WEEK — Emmanuel + Russell:** Pull 60-day Chorus signal on all SEU contacts. Confirm champion engagement.
3. **NEXT 14 DAYS — Russell:** Lock pricing-envelope authorization in writing to Emmanuel.
4. **NEXT 30 DAYS — Russell + Brian:** Confirm BME contract economics still incentivize defense.
5. **CONTINUOUS — Sunday renewal-forecast skill:** This opp called out explicitly every week until close.

## Response if non-renewal or material downsize
See PM-014 response playbook in full. Headline: Russell notifies Chasen + CFO within 24 hours. CFO notifies Barclays within 5 business days. Russell + Massimo Riyadh travel within 14 days if any save play remains. POS-017 retesting + WS-12 timeline compression considered.

## How this file gets maintained
- Sunday `class-renewal-and-calls-sunday` scheduled task refreshes Chorus + SF activity weekly
- Update this file whenever Chorus engagement summary surfaces new signal
- If renewal closes, update with outcome + score predictions in PM-014
- If new top-customer concentration emerges (e.g., another account approaches 8%+), create a parallel file
