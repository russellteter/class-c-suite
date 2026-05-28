#!/usr/bin/env bash
# scan-staged-secrets.sh — scan git-staged files for credential patterns.
# Invoked by .husky/pre-commit. Exits non-zero to block the commit on a match.
# Skips: fixtures/, *.env.local, *.env.example, lockfiles.

set -euo pipefail

SKIP_PATHS_RE='(^|/)fixtures/|\.env\.local$|\.env\.example$|package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$'

# Safe-content exclusions — only suppress when line has an explicit safe label.
# Must be anchored near an assignment/value context to avoid over-matching real keys
# that happen to contain words like "example". Uses case-insensitive match.
SAFE_RE='(["'"'"'= ](fake|placeholder|dummy|your[-_]|changeme)|<[A-Z_]+>|#.*(test|example|fixture|mock|sample)|// *(test|example|fixture|mock|sample))'

# Get staged files
STAGED=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null)
if [[ -z "$STAGED" ]]; then
  exit 0
fi

FOUND=0

scan_content() {
  local FILE="$1"
  local CONTENT="$2"

  # Helper: run grep with a pattern safely (handles leading dashes via -e)
  check_pattern() {
    local PAT="$1"
    local DESC="$2"
    local MATCHES
    MATCHES=$(printf '%s\n' "$CONTENT" | grep -nE -e "$PAT" | grep -viE "$SAFE_RE" || true)
    if [[ -n "$MATCHES" ]]; then
      echo ""
      echo "[SECRET-SCAN] Potential credential in staged file: $FILE"
      echo "  Rule: $DESC"
      echo "  Matches:"
      printf '%s\n' "$MATCHES" | sed 's/^/    /'
      return 1
    fi
    return 0
  }

  local LOCAL_FOUND=0

  check_pattern 'AKIA[0-9A-Z]{16}'                            'AWS access key'          || LOCAL_FOUND=1
  check_pattern 'xox[baprs]-[0-9A-Za-z-]+'                   'Slack token'             || LOCAL_FOUND=1
  check_pattern 'sk-[A-Za-z0-9]{20,}'                         'OpenAI/sk- key'          || LOCAL_FOUND=1
  check_pattern 'AIza[0-9A-Za-z_-]{35}'                       'Google API key'          || LOCAL_FOUND=1
  check_pattern 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.' 'JWT token'              || LOCAL_FOUND=1
  check_pattern 'NTB[0-9A-F]{30,}'                            'NetSuite TBA token'      || LOCAL_FOUND=1

  # PEM blocks — use literal string match via fgrep to avoid dash-as-flag issue
  for PEM_HEADER in \
    '-----BEGIN RSA PRIVATE KEY-----' \
    '-----BEGIN EC PRIVATE KEY-----' \
    '-----BEGIN OPENSSH PRIVATE KEY-----' \
    '-----BEGIN PRIVATE KEY-----'; do
    PEM_MATCH=$(printf '%s\n' "$CONTENT" | grep -nF -- "$PEM_HEADER" | grep -viE "$SAFE_RE" || true)
    if [[ -n "$PEM_MATCH" ]]; then
      echo ""
      echo "[SECRET-SCAN] Private key PEM block in staged file: $FILE"
      printf '%s\n' "$PEM_MATCH" | sed 's/^/    /'
      LOCAL_FOUND=1
    fi
  done

  return $LOCAL_FOUND
}

for FILE in $STAGED; do
  # Skip excluded paths
  if printf '%s\n' "$FILE" | grep -qE "$SKIP_PATHS_RE"; then
    continue
  fi

  # Skip binary files
  if git show ":$FILE" 2>/dev/null | file - | grep -q 'binary'; then
    continue
  fi

  # Get staged content
  CONTENT=$(git show ":$FILE" 2>/dev/null) || continue

  scan_content "$FILE" "$CONTENT" || FOUND=1
done

if [[ $FOUND -ne 0 ]]; then
  echo ""
  echo "[SECRET-SCAN] Commit BLOCKED. Remove or move the above secrets to a vault/env file."
  echo "  If this is a test fixture, add it to .gitleaks.toml allowlist and re-stage."
  exit 1
fi

echo "[SECRET-SCAN] Staged files clean."
exit 0
