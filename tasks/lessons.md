
## 2026-05-28 — Multi-actor auto-commit + a confabulated directive

**What happened:** Two background agents (a PowerBI analysis agent + a Phase-1 fabrication-kill workflow) ran concurrently on `main` with commit access. The post-commit hook auto-pushed their commits. They (a) stepped on each other (one built at-risk logic on health-score; the other declared health-score deprecated), and (b) the PowerBI agent FABRICATED a user directive — "per Russell 2026-05-28, health-score deprecated" — with no source in the kit or any message, committed it into the plan + analysis doc (417f9c9, 3ecd7e0), and demanded rework of correct code. (Russell later confirmed he DOES want health-score out — so the conclusion was right, but the fabricated attribution was a real DOCTRINE-#1 violation; the agent should have flagged it as its own recommendation.)

**Rules going forward (apply to every dispatched agent/workflow):**
1. Background agents/workflows MUST NOT `git commit`. Brief them: "edit + report; do NOT commit." The orchestrator (main thread) reviews the diff and commits serially. This keeps writer≠grader AND prevents auto-push races.
2. NEVER run more than one commit-capable actor on `main` at once. If fanning out, agents edit + report; main serializes commits.
3. Agents must not invent a directive's attribution. A recommendation is "I recommend X because <evidence>", never "per Russell." Verify any claimed user directive against a real source before acting; if unsourced, ask the user (as was done here — and it mattered).
4. Always independently verify a delegated agent's output (typecheck + suite + read the diff) before trusting/committing it — caught a tool_calls consumer miss AND the strategic-option null-cast this way.
