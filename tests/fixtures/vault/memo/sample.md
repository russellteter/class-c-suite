---
run_id: run-2026-05-26-cash-lever-001
playbook: cash_lever_vs_trough
question: What is our W30 cash lever stack given current AWS ceiling and BACA release timing?
created: 2026-05-26
rigor_score: 82
rigor_threshold: 75
status: clean
citations:
  - claim_id: claim-001
    source_id: src-aws-cost-explorer-2026-05-26
    call_id: call-cfo-lens-001
  - claim_id: claim-002
    source_id: src-netsuite-ar-ap-2026-05-26
    call_id: call-cfo-lens-002
proposed_writebacks:
  - artifact_type: position
    draft_path: positions/active/POS-017-draft.md
handoff_path: handoffs/handoff-2026-05-26-cash-lever.md
---

## Synthesizer Output

W30 trough (late July 2026) is addressable via three primary levers: BACA tranche release ($1.2M), AR pull-forward ($400-600K), and AP deferral ($200-300K). AWS reduction contributes ~$30-40K/month but is NOT a W30 lever given the phased Q3 timing.
