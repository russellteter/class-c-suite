# ADR-0017 — Real Model Client Keystone (B47)

**Date:** 2026-05-28
**Status:** Accepted
**Supersedes:** N/A — first real-client decision

---

## Context

From Ch.0 through Ch.10, all model calls routed through `StubClaudeClient` (`packages/stub-harness`). The `live` stub mode threw intentionally. No `@anthropic-ai/sdk` or Agent SDK dependency existed anywhere. The mock-reliance audit (2026-05-28, Finding 1, P0) confirmed: the product could not perform real strategic analysis in any deployment mode.

Russell cannot use `ANTHROPIC_API_KEY` (pay-per-token). He holds a Claude Max subscription and a separate monthly Agent-SDK credit (effective 2026-06-15). Authentication must flow exclusively through `CLAUDE_CODE_OAUTH_TOKEN`.

---

## Decision

### SDK

Use `@anthropic-ai/claude-agent-sdk` (the Claude Code engine SDK). NOT `@anthropic-ai/sdk` (pay-per-token REST client). Installed in `apps/utility` only.

### Auth precedence (Max subscription)

1. `CLAUDE_CODE_OAUTH_TOKEN` — minted via `claude setup-token`. Placed in `apps/main/.env.local`. Inherited by utility process.
2. Logged-in Claude Code session — the SDK will use it if CLAUDE_CODE_OAUTH_TOKEN is absent and a session exists.
3. If neither: `ClaudeAuthMissingError` (thrown in `RealClaudeClient` constructor). Message tells Russell to run `claude setup-token`.

`ANTHROPIC_API_KEY` must be absent. `RealClaudeClient.invoke()` strips it from the env object passed to `query()` as a defense-in-depth guard — a stale key in the environment cannot accidentally trigger pay-per-token billing.

### Factory rule (`modelClientFromEnv()`)

| `STUB_MODE` value | Client returned | Intended use |
|---|---|---|
| `replay` (or unset) | `StubClaudeClient(replay, fixtureDir)` | CI / unit tests |
| `record` | `StubClaudeClient(record, fixtureDir)` | Dev: record new fixtures |
| `live` | `RealClaudeClient()` | Production (Electron) |

`apps/main/src/supervisor.ts` sets `STUB_MODE=live` when forking the utility process (overridable by env). Tests set `STUB_MODE=replay` or leave it unset.

### Model policy (cost-aware, capped monthly Agent-SDK credit)

| Role | Model |
|---|---|
| `Verifier` | `claude-opus-4-7` (rigor-critical, anti-sycophancy gate) |
| All others | `claude-sonnet-4-6` (default) |

This is a simple static map in `realClaudeClient.ts`. No over-engineering.

### Single-shot call pattern

```ts
for await (const m of query({
  prompt: JSON.stringify(context),
  options: { systemPrompt, model, allowedTools: [], permissionMode: 'dontAsk', maxTurns: 1, env: safeEnv },
})) {
  if (m.type === 'assistant' && m.message?.content)
    for (const b of m.message.content) if ('text' in b) text += b.text;
  if (m.type === 'result' && 'usage' in m && m.usage)
    usage = m.usage; // { input_tokens, output_tokens }
}
```

Text is parsed as JSON. Failure throws `ClaudeOutputParseError`. Token counts map `input_tokens → tokensIn`, `output_tokens → tokensOut`.

---

## Scope of this keystone

This ADR covers:
- `RealClaudeClient` (`apps/utility/src/agents/realClaudeClient.ts`)
- `modelClientFromEnv()` factory (`apps/utility/src/agents/modelClient.ts`)
- Wiring in `dispatch.ts` (lens dispatch) and `run-loop.ts` (Verifier invoker)
- Supervisor env injection (`STUB_MODE=live`, `CLAUDE_CODE_OAUTH_TOKEN` passthrough)

---

## Explicitly deferred (B47 follow-ups)

- **Real Verifier** — run-loop Verifier still uses `StubVerifierInvoker`; it now takes a `RealClaudeClient` when `STUB_MODE=live`, but the Verifier's system prompt is still `'STUB — see Ch.4'`. Full Verifier wiring is a separate chapter.
- **Real Synthesizer** — `proposedWritebacks: []` stubs remain (`// B47-followup:` markers added).
- **Real playbook data** — cash-lever, pre-mortem, etc. hardcoded data stubs unchanged.
- **Scheduled jobs** — sundayRenewal, mondayTripwire still use placeholder data.
- **Electron packaging** — `@anthropic-ai/claude-agent-sdk` bundles the Claude Code CLI executable. Native binary + ASAR packaging interaction is untested. This must be audited before a `.dmg` distribution build. Flag: Ch.11 gate.

---

## Agent-SDK credit model (2026-06-15)

Russell's Max subscription will add a separate monthly Agent-SDK credit pool. Until that date, calls against `CLAUDE_CODE_OAUTH_TOKEN` draw from the standard Max token budget. No action required now; revisit billing attribution after 2026-06-15.

---

## Russell action required to go live

1. Run `claude setup-token` in terminal.
2. Copy the printed token into `apps/main/.env.local` as `CLAUDE_CODE_OAUTH_TOKEN=<token>`.
3. Ensure `ANTHROPIC_API_KEY` is NOT set in that file or shell environment.
4. Set `STUB_MODE=live` in `apps/main/.env.local` (or leave unset — supervisor defaults to `live`).
5. Run a live playbook and observe that the Verifier and lens calls hit the real model.
