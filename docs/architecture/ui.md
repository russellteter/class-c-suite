# UI / UX + Design System

> Design tokens. Screen inventory. The round-table "honest-signal" contract. `html-driven-codev` mockup sequence. Implementation contract for Chapters 5, 6, 7, 9, 10 (UI portions). Marks `🔍 R0/R1/R2 VERIFY:` and `🎨 DESIGN GATE` where Russell-approved mockups precede coding.

## Design philosophy

- **Honest signal over animation theater.** Every pulse, edge, ribbon-number, and indicator in the UI is bound to a real IPC event. Animation in the absence of substance is the Devin-style failure mode. The substance ribbon shows source count + verified citation ratio + coverage % **in real time, computed from actual tool-call results**. The verified citation ratio shows `—` until the Verifier actually grades.
- **Dark menubar-native aesthetic.** The C-Suite lives in macOS Sonoma+/Sequoia menubar; design tokens fit that surface.
- **Brand-aware re-skin surface.** Design tokens map to Class's brand palette so the C-Suite reads as a Class artifact, not generic Electron-AI.
- **Density over chrome.** Russell is a power user; surfaces optimize for "scan-and-act in 30 seconds" not "tutorial."

## Design tokens

```css
/* Color (Class brand — 🔍 R0 VERIFY exact hex against class-brand-* skills) */
:root {
  --color-navy-900: #0a1849;        /* primary background, depths */
  --color-navy-700: #182a6b;        /* surface elevated */
  --color-navy-500: #2a3f8a;        /* hover / focus rings */
  --color-gold-500: #c9a14b;        /* accent — rigor-pass, committed actions */
  --color-purple-500: #4739e7;      /* accent — agents, round-table edges */
  --color-purple-400: #6a5cf0;      /* hover purple */

  /* Semantic */
  --color-rigor-clean: var(--color-gold-500);
  --color-rigor-draft: #d6883a;     /* amber for DRAFT memos */
  --color-rigor-fail: #c54848;      /* red for verifier-rejection */
  --color-success: #4fae6a;          /* green for tripwire-clear, accepted writebacks */
  --color-warning: #e3b341;
  --color-error:   #ff5c5c;

  /* Text */
  --color-text-primary:   #f5f3ff;
  --color-text-secondary: #b8b4d6;
  --color-text-muted:     #6b6788;

  /* Surfaces */
  --color-surface-1: rgba(255,255,255,0.04);   /* glass tier 1 */
  --color-surface-2: rgba(255,255,255,0.07);   /* glass tier 2 */
  --color-surface-3: rgba(255,255,255,0.10);   /* glass tier 3 */
  --color-border:    rgba(255,255,255,0.12);
}

/* Typography */
:root {
  --font-sans: -apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-md: 16px;
  --text-lg: 19px;
  --text-xl: 23px;
  --text-2xl: 28px;
  --text-3xl: 34px;
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.65;
}

/* Spacing (8px scale with 4px half-steps for compact areas) */
:root {
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px;
}

/* Motion */
:root {
  --motion-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
  --motion-base: 240ms cubic-bezier(0.4, 0, 0.2, 1);
  --motion-slow: 480ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

🔍 R0 VERIFY: every color hex against `class-brand-voice` / `class-brand-presentations` / `class-ppt-cyan-light` skill files. The values above are spec-grade starting points; correct to Class's actual brand spec.

## Screen inventory

| Screen | Purpose | Mockup-gate ordinal | Chapters |
|---|---|---|---|
| **Home** | At-a-glance operational state; 8 playbook tiles; Open Q&A bar; tripwire proximity; cost meter | 1 (design-system sheet first) | Ch.5 stub → Ch.7 full |
| **Plan-approval** | Show RunPlan (lenses, MCPs, expected sources); approve/edit/cancel; per-playbook auto-approve countdown | 2 | Ch.5 |
| **Round-table** | Live lens fan-out; substance ribbon per node; tool-call indicator; Synthesizer/Verifier downstream nodes; round-table progress and timing | 3 (most review cycles expected) | Ch.5 |
| **Memo viewer** | Final memo; rigor score badge; per-claim source-id link → click-to-tool-call-result; DRAFT banner if applicable | 4 | Ch.5 |
| **Write-back review pane** | List of proposed write-backs; diff-against-existing; Accept/Edit/Reject buttons; per-artifact conversation pane | 5 | Ch.6 |
| **Conversation pane (per write-back)** | Typed-feedback textbox; iteration history; "commit, reject, or escalate" surface at N=3 | 6 | Ch.6 |
| **Open Q&A bar** | Single textbox on home; ad-hoc decomposition; QUICK READ / AD-HOC stamp surfaces in resulting memo | 7 | Ch.7 |
| **Handoff preview** | Cowork brief preview with rationale chain + named brand skills; "Send to Cowork" persists | 8 | Ch.9 |
| **Job-status surface (home strip)** | 5 scheduled jobs; last fired; status; degraded-mode flags | 9 | Ch.10 |
| **Cost meter (always visible)** | Window-remaining tokens; per-run cost; cumulative-daily | (integrated into home + memo header) | Ch.1 wire; Ch.5 surface |
| **Settings** | MCP auth status; per-service reconnect; cron view; rigor threshold; vault path | 10 | Ch.8 + Ch.10 |
| **Run history** | Past runs; filter by playbook / rigor / date; click → memo viewer | 11 | Ch.7 |
| **Audit queue (rigor 70-84)** | First-month tuning surface | 12 | Ch.12 optional |

## Round-table "honest-signal" contract

The round-table is the most visible UI surface. Every visual signal binds to a real event:

| Visual element | Bound to IPC event | What it shows |
|---|---|---|
| Lens node "pulse on" | `agent.start` | Lens has started reasoning |
| Lens node "pulse off" | `agent.complete` | Lens output validated by schema |
| Edge from lens → orchestrator | `agent.tool.pre` → `.post` | Tool call in flight; result returned |
| Substance-ribbon `sources: N` | `tool_calls` count per agent | Real count, not animated |
| Substance-ribbon `verified: X/N` | Verifier's per-source PASS count | `—` until Verifier runs |
| Substance-ribbon `coverage: P%` | Verifier's coverage metric | `—` until Verifier runs |
| Synthesizer node lit | `synthesizer.draft` event | Draft memo bytes ready |
| Verifier node lit (color = score) | `verifier.score` event | Score 0-100 + breakdown |
| DRAFT banner on memo | memo.status == 'draft' | Honest failure-mode signal |

**Animation theater rule:** if there is no event, there is no animation. The default state for a metric that hasn't computed yet is `—` (em-dash), not `0` or `Pending…` — Russell can distinguish "missing" from "low" at a glance.

🎨 DESIGN GATE: round-table mockup is expected to receive the most iteration cycles (3-5). Sequence accordingly in `html-driven-codev`.

## `html-driven-codev` mockup sequence (12 steps)

Per `DOCTRINE.md` law #5 and `interactive-html-decisions` / `html-driven-codev` skills. Russell approves each mockup before its screen is coded.

| Step | Screen / artifact | Goal of the mockup |
|---|---|---|
| 1 | **Design-system sheet** | Token palette, typography scale, component library on one page. Approve once; downstream gates inherit. |
| 2 | **Home (stub)** | 8 playbook tiles + Open Q&A bar + tripwire strip. Pre-data version for layout approval. |
| 3 | **Plan-approval** | Approve/edit/cancel layout; auto-approve countdown affordance. |
| 4 | **Round-table — quiet state** | 6 lens nodes, idle; substance ribbon present but empty. |
| 5 | **Round-table — mid-run** | 3 lenses active, 3 idle; tool-call indicators; one substance ribbon populated. |
| 6 | **Round-table — synthesis stage** | Lens nodes complete; Synthesizer lit; Verifier idle. |
| 7 | **Memo viewer — clean** | Rigor-pass banner; per-claim source link; citation hover surface. |
| 8 | **Memo viewer — DRAFT** | DRAFT banner; failure reasons in expandable panel. |
| 9 | **Write-back review pane** | List + diff-against-existing + action buttons per artifact. |
| 10 | **Conversation pane** | Typed feedback + iteration history + N=3 surface. |
| 11 | **Handoff preview** | Brief layout + named brand skills + "Send to Cowork" CTA. |
| 12 | **Home — full data** | Real data populated; cost meter; job-status strip; recent memos surfacing. |

Each step produces an HTML mockup written to `~/Desktop/cstuite-design-step-<N>.html` per the `html-driven-codev` pattern. Russell's approval persists to a markdown file the orchestrator reads. No coding of the screen until its step's mockup is approved.

## Seven Day-Zero HTML Q&A forms

These are the first-run product configuration forms. On Russell's first scheduled-job run after Ch.11 ship, the home screen surfaces these as a 7-step wizard. Russell can defer any one and the relevant skill runs with the documented assumption flagged.

| Form | What it captures | Used by |
|---|---|---|
| 1. NRR board-target | The specific NRR figure Russell uses with the board | `weekly-cash-forecast` + Strategic option playbook |
| 2. Competitor list | The companies the CMO lens compares Class against | `class-brand-voice` + Strategic option + Board narrative |
| 3. Sentiment phrases | Specific phrases that indicate "at-risk" vs "stable" customer sentiment | `call-intelligence` + CRO lens prompt |
| 4. Covenant cutoff + terms | Verbatim from Barclays credit agreement (B6 mitigation) | `covenant-tracker` + autonomy tripwire |
| 5. Run-critique weights | Russell's weighting of the run-critique rubric dimensions | `run-critique` skill / Run-Critic agent |
| 6. Bases mapping (B13) | Decision frontmatter → Bases query field mapping | Write-back schema + UI surfacing |
| 7. PowerBI signals (B2) | Confirmation of which PowerBI signals are usable per playbook | mcp.md PowerBI section |

🎨 DESIGN GATE: this wizard is mocked as part of mockup step 12 (home full-data).

## Component library

Built on React; design-system primitives:

```tsx
// Composable primitives (TypeScript + Tailwind-style class names → CSS variables)
<Stack space={4}>
  <Heading level={2}>Cash position</Heading>
  <Card surface={2} padding={5}>
    <Cluster>
      <RigorBadge score={87} threshold={70} />
      <Tag color="success">CLEAN</Tag>
      <Tag color="muted">3 days ago</Tag>
    </Cluster>
    <Body>…</Body>
    <CitationStrip citations={memo.citations} />  {/* click → tool-call result */}
  </Card>
</Stack>

<RoundTable runId={runId}>
  {/* subscribes to IPC; pulses bound to real events */}
  <LensNode role="CEO" />
  <LensNode role="CFO" />
  {/* ... */}
  <SubstanceRibbon agentId={agentId} />
</RoundTable>

<WritebackCard
  writebackId={wb.id}
  artifactType="position"
  diff={diff}
  iterationCount={wb.iteration_count}
  onAccept={...} onEdit={...} onReject={...} onFeedback={...}
/>
```

## Native macOS integration

- **Menubar app** via Electron's `Tray` API.
- **Global hotkey** via Electron's `globalShortcut` API; defaults to `Cmd+Shift+C` (configurable in Settings).
- **Native notifications** via Electron's `Notification` API; categories: tripwire-flip, memo-ready, scheduled-job-failure, mcp-auth-expired.
- **LaunchAgent registration** in Ch.10 so the C-Suite runs at user login.
- **Dock icon** hidden by default (it's a menubar app); show on focus only.

🔍 R2 VERIFY: macOS Sequoia notification entitlement behavior; user must grant notification permission on first run. Document in setup runbook.

## Accessibility (for Russell single-user, but design for it)

- All interactive elements keyboard-reachable (Tab order specified).
- Focus rings via `--color-purple-500` 2px outline.
- Screen-reader labels on RigorBadge, SubstanceRibbon counts, CitationStrip clicks.
- WCAG AA contrast verified on all token combinations.

## Open items for Phase R

| Item | Sub-phase | Reference |
|---|---|---|
| Class brand color hex verification | R0 | brand-skill files |
| Class typography (font family + scale) | R0 | brand-skill files |
| Round-table layout (force-directed vs grid) — depends on perf with N=12 nodes | R2 | UI Ch.5 |
| Global hotkey default + accessibility for users who can't use Cmd+Shift+C | (decide-and-log) | Settings screen |
| Notification permission UX flow | R2 | Setup runbook |
