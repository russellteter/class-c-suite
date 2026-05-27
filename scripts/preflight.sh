#!/bin/bash
# C-Suite pre-flight verification.
# Runs BEFORE Phase R to catch environment / tool / skill / vault problems that
# would otherwise blow up hours into the research pass.
#
# Idempotent. Non-destructive. Exits 0 if all critical checks pass; non-zero if
# any blocking check fails. Reports green/yellow/red per check, with the
# specific fix command where one exists.
#
# Usage:
#   ./scripts/preflight.sh                 # full check
#   ./scripts/preflight.sh --quiet         # only print failures
#   ./scripts/preflight.sh --fix-hooks     # also install git hooks

set -uo pipefail

VAULT_PATH="/Users/russellteter/Documents/Claude/Projects/Business Planning"
# Both names possible — PRD originally said "-poc"; actual GH repo dropped the suffix.
POC_PATHS=(
  "/Users/russellteter/Claude Code Projects/customer-dashboard"
  "/Users/russellteter/Claude Code Projects/customer-dashboard-poc"
)
SKILLS_DIR="$HOME/.claude/skills"
EXTRACTED_SKILLS_FILE="/Users/russellteter/Documents/Claude/Projects/Business Planning/_extracted_skills_for_c_suite.md"

QUIET=0; FIX_HOOKS=0
for arg in "$@"; do
  case "$arg" in
    --quiet) QUIET=1 ;;
    --fix-hooks) FIX_HOOKS=1 ;;
  esac
done

FAILS=0; WARNS=0
green()  { [ "$QUIET" = 1 ] && return; printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn()   { printf '  \033[33m⚠\033[0m %s\n' "$1"; WARNS=$((WARNS+1)); }
fail()   { printf '  \033[31m✗\033[0m %s\n' "$1"; FAILS=$((FAILS+1)); }
section(){ [ "$QUIET" = 1 ] && return; printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

# -------- Vault checks (BLOCKERS B9 + data.md vault contract) --------
section "Vault"
if [ -d "$VAULT_PATH" ]; then
  green "Vault path exists: $VAULT_PATH"
else
  fail "Vault path missing: $VAULT_PATH"
fi

if [ -d "$VAULT_PATH/.git" ]; then
  green "Vault is git-initialized"
else
  warn "Vault is NOT git-initialized — Ch.0/Ch.2 must run 'git init' before SafeWrite ships"
fi

# iCloud-sync check (B9): files under iCloud-Drive-managed paths set the
# com.apple.fileprovider.fpfs#P xattr, OR live under "Mobile Documents".
if [[ "$VAULT_PATH" == *"Mobile Documents"* ]]; then
  fail "Vault path is under iCloud Mobile Documents — atomic-rename hazard (B9). Move to a non-iCloud path."
elif xattr "$VAULT_PATH" 2>/dev/null | grep -q "com.apple.fileprovider"; then
  fail "Vault has iCloud sync xattr — atomic-rename hazard (B9). See setup runbook."
else
  green "Vault not iCloud-synced (no fileprovider xattr)"
fi

if [ -f "$VAULT_PATH/C_Suite_PRD.md" ]; then
  green "Vault contains C_Suite_PRD.md (source of truth)"
else
  fail "Vault does NOT contain C_Suite_PRD.md — source corpus not where expected"
fi

# -------- customer-dashboard (PowerBI; PRD §6 + mcp.md + decision #9) --------
section "customer-dashboard (PowerBI)"
POC_FOUND=""
for p in "${POC_PATHS[@]}"; do
  if [ -d "$p" ]; then POC_FOUND="$p"; break; fi
done
if [ -n "$POC_FOUND" ]; then
  green "customer-dashboard found at $POC_FOUND"
else
  warn "customer-dashboard not found at expected paths — clone from https://github.com/russellteter/customer-dashboard"
fi

# -------- Extracted skills file from Cowork (B17 remediation) --------
section "Extracted-skills file (B17 remediation)"
if [ -f "$EXTRACTED_SKILLS_FILE" ]; then
  green "extracted-skills file present: $EXTRACTED_SKILLS_FILE — R0 reads + installs / codifies"
else
  warn "extracted-skills file missing — run scripts/cowork-extract-skills.md prompt in Cowork to generate"
fi

# -------- MEMORY.md (CLAUDE.md §6 + RESEARCH.md R0) --------
section "Memory"
MEM_HITS=$(find "$HOME/Library/Application Support/Claude/local-agent-mode-sessions" -name MEMORY.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$MEM_HITS" -ge 1 ]; then
  green "$MEM_HITS MEMORY.md file(s) found — R0 picks the correct one"
else
  warn "No MEMORY.md under local-agent-mode-sessions — R0 will need alternative"
fi

# -------- Required CLI tools --------
section "CLI tools"
for cmd in node pnpm git gh; do
  if command -v "$cmd" >/dev/null 2>&1; then
    green "$cmd: $(command -v "$cmd")"
  else
    fail "$cmd: not installed"
  fi
done
for cmd in sf aws; do
  if command -v "$cmd" >/dev/null 2>&1; then
    green "$cmd: $(command -v "$cmd")"
  else
    warn "$cmd: not installed (needed for Ch.8 MCP integration; defer if you want)"
  fi
done

NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v//;s/\..*//')
if [ -n "${NODE_MAJOR:-}" ] && [ "$NODE_MAJOR" -ge 20 ]; then
  green "node major version $NODE_MAJOR (>=20 required for modern Electron)"
else
  warn "node major version $NODE_MAJOR — Electron 28+ requires Node 20+"
fi

# -------- Skills referenced in PRD/CLAUDE.md/DOCTRINE.md --------
section "Skills"
EXPECTED_BRAND=(class-brand-voice class-brand-document class-brand-excel class-brand-presentations)
EXPECTED_OPLOGIC=(russell-voice run-critique weekly-cash-forecast covenant-tracker renewal-forecast call-intelligence system-check class-aws-connector)
EXPECTED_INFRA=(firecrawl context7 github-search)

for s in "${EXPECTED_BRAND[@]}"; do
  if [ -d "$SKILLS_DIR/$s" ]; then green "skill: $s"; else warn "skill: $s NOT installed (brand)"; fi
done
for s in "${EXPECTED_OPLOGIC[@]}"; do
  if [ -d "$SKILLS_DIR/$s" ]; then green "skill: $s"; else fail "skill: $s NOT installed (op-logic; BLOCKERS B17)"; fi
done
# infra skills may live outside ~/.claude/skills (e.g. as MCP plugins); soft-check
for s in "${EXPECTED_INFRA[@]}"; do
  if grep -ril "name: $s" ~/.claude/ 2>/dev/null | head -1 >/dev/null; then
    green "skill/plugin: $s reachable"
  else
    warn "skill/plugin: $s not found — confirm via /agents or plugin manager"
  fi
done

# -------- Git hooks (auto-push durability) --------
section "Git hooks"
if [ -x "hooks/post-commit" ]; then green "hooks/post-commit present + executable"; else fail "hooks/post-commit missing or not executable"; fi
HOOKS_PATH=$(git config --get core.hooksPath 2>/dev/null || true)
if [ "$HOOKS_PATH" = "hooks" ]; then
  green "core.hooksPath = hooks"
else
  if [ "$FIX_HOOKS" = 1 ]; then
    ./scripts/install-hooks.sh && green "core.hooksPath set by --fix-hooks"
  else
    fail "core.hooksPath != hooks (run ./scripts/install-hooks.sh OR rerun preflight with --fix-hooks)"
  fi
fi

# -------- Remote reachable --------
section "GitHub remote"
if git ls-remote origin HEAD >/dev/null 2>&1; then
  green "origin reachable + auth OK"
else
  fail "origin not reachable — auto-push will fail; check network + 'gh auth status'"
fi

# -------- Summary --------
section "Summary"
echo "  fails: $FAILS    warns: $WARNS"
if [ "$FAILS" -gt 0 ]; then
  echo
  echo "BLOCKED — fix the failures above before running Phase R."
  exit 1
else
  echo
  echo "OK — environment ready for Phase R."
  [ "$WARNS" -gt 0 ] && echo "Warnings are non-blocking but worth resolving before the chapters they bite at."
  exit 0
fi
