# Ch.8 — Notarization Smoke Brief (B14)

Single-purpose: run a throwaway notarization round-trip on a `.dmg` build of the C-Suite. Don't wait for Ch.11 to discover entitlements are wrong.

## Contract
`docs/decisions/0010-ch8-mcp-integration.md` §12 + BLOCKERS §B14.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Scope (yours alone — non-overlapping with Gmail / NetSuite / AWS+Chorus)

### 1. electron-builder config
Verify `apps/main/build/entitlements.mac.plist` exists (Ch.11 spec). Minimum key: `com.apple.security.cs.allow-jit`. If file absent: create with the minimum entitlement.

Verify `apps/main/build/electron-builder.yml` (or `package.json` `build:` section) has notarization config. If absent: create the minimum:
```yaml
mac:
  category: public.app-category.productivity
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize: false  # we run notarytool manually in this smoke
```

### 2. Build the DMG
- `pnpm electron-builder build --mac --publish=never` from repo root.
- Output: `dist/C-Suite-*.dmg`.
- If build fails: capture stderr, write to `docs/research/R3-notarization-smoke.md`, halt, report failure.

### 3. Notarization round-trip
Russell must provide:
- `APPLE_ID` (his Apple developer account email).
- `APPLE_TEAM_ID` (Class Apple Developer team ID).
- `APPLE_APP_PASSWORD` (app-specific password, NOT the iCloud password) — Russell generates at https://appleid.apple.com → Sign-In and Security → App-Specific Passwords.

Run:
```sh
xcrun notarytool submit dist/C-Suite-*.dmg \
  --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_PASSWORD" \
  --wait
```

On success:
```sh
xcrun stapler staple dist/C-Suite-*.dmg
```

### 4. Verify
- `spctl --assess --type install dist/C-Suite-*.dmg` should return "accepted" + source "Notarized Developer ID".
- Install + launch the stapled DMG. Confirm no "developer cannot be verified" warning. Main process starts. Window renders.

### 5. Document
Write `docs/research/R3-notarization-smoke.md`:
- Build command + duration.
- DMG size + path.
- Notarization submission ID + duration + status.
- Stapler success.
- spctl assessment result.
- Any warnings or errors encountered.
- Working entitlements file content.
- Apple Developer team ID + bundle ID confirmed.
- **Findings for Ch.11 setup runbook.**

If Russell hasn't provided credentials: write the doc with "BLOCKED awaiting APPLE_ID + APPLE_TEAM_ID + APPLE_APP_PASSWORD" + the steps to generate. Halt.

## Forbidden inferences
- Hard-coding Apple credentials in source or commits.
- Skipping `--wait` on notarytool submit (must wait for the actual notarization verdict, not just receipt of submission).
- Touching other Ch.8 surfaces.

## What "done" looks like
- Either: DMG notarized + stapled + spctl-accepted (PASS) + findings doc written.
- OR: BLOCKED-awaiting-Russell with the exact missing inputs documented.
- Either way: one commit `ch.8 notarize: <result> — <one-line>`. No Claude attribution.

## Russell-action items
- Provide `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_PASSWORD` env vars to run this sub-agent.
- If you don't have an app-specific password: https://appleid.apple.com → Sign-In and Security → App-Specific Passwords.
- If you don't have a Class Apple Developer team ID: log into https://developer.apple.com → Membership → Team ID.

## Report-back (≤200 words)
- Status: PASS / BLOCKED / FAILED.
- DMG path + size.
- Notarization submission ID + verdict.
- spctl result.
- Findings for Ch.11 setup runbook (top 3).
- Russell-action items if BLOCKED.
