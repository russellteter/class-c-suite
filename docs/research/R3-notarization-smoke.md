# R3 — Notarization Smoke Test

**Date**: 2026-05-27  
**Status**: BLOCKED — awaiting Apple credentials  
**Ref**: Ch.8 brief B14, ADR §12

---

## What was done

1. Verified `electron-builder.yml` at repo root — mac section already correct (hardenedRuntime, gatekeeperAssess, entitlements paths).
2. Found `apps/main/build/` missing — created it.
3. Created `apps/main/build/entitlements.mac.plist` with minimum + recommended entitlements for Electron + MCP.
4. Confirmed `appId: com.classedu.csuite`, `productName: C-Suite`.

---

## BLOCKED: missing credentials

The notarization round-trip cannot proceed without:

| Var | Description | How to get |
|-----|-------------|------------|
| `APPLE_ID` | Apple Developer account email | Already know this — the email used to log into developer.apple.com |
| `APPLE_TEAM_ID` | Class Apple Developer team ID | https://developer.apple.com → Account → Membership → Team ID |
| `APPLE_APP_PASSWORD` | App-specific password (NOT iCloud password) | https://appleid.apple.com → Sign-In and Security → App-Specific Passwords → Generate |

Provide these as env vars in the shell where you invoke the sub-agent, or export them before running:

```sh
export APPLE_ID="your-apple-id@example.com"
export APPLE_TEAM_ID="XXXXXXXXXX"
export APPLE_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

Then re-run this sub-agent. It will proceed automatically from Step 2 (DMG build).

---

## State of build surface (as-found + fixed)

| Item | Status |
|------|--------|
| `electron-builder.yml` mac section | Pre-existing, correct |
| `hardenedRuntime: true` | Set |
| `gatekeeperAssess: false` | Set |
| `entitlements` + `entitlementsInherit` both pointing to `build/entitlements.mac.plist` | Set |
| `notarize:` key (manual smoke uses notarytool directly) | Commented out — correct for manual smoke |
| `afterSign:` hook (Ch.11 automated path) | Commented out — correct for now |
| `apps/main/build/` directory | Created (was absent) |
| `apps/main/build/entitlements.mac.plist` | Created (was absent) |
| DMG build (`pnpm electron-builder build --mac --publish=never`) | NOT run — blocked before this step |
| `xcrun notarytool submit` | NOT run — blocked |
| `xcrun stapler staple` | NOT run — blocked |
| `spctl --assess` | NOT run — blocked |

---

## Entitlements file (written)

Path: `apps/main/build/entitlements.mac.plist`

Keys included:

- `com.apple.security.cs.allow-jit` — required for Electron's V8 JIT
- `com.apple.security.cs.allow-unsigned-executable-memory` — required for Node.js native modules
- `com.apple.security.cs.disable-library-validation` — required for dynamic library loading (Electron, native addons)
- `com.apple.security.network.client` — MCP server HTTP calls, Claude API
- `com.apple.security.network.server` — MCP stdio bridge localhost listener

If the app later needs filesystem access outside its sandbox, add:
- `com.apple.security.files.user-selected.read-write` (file picker)
- `com.apple.security.files.downloads.read-write` (Downloads folder)

---

## Procedure to run once credentials are available

```sh
# 1. Build DMG
cd "/Users/russellteter/Claude Code Projects/c-suite"
pnpm electron-builder build --mac --publish=never

# 2. Submit for notarization (wait for verdict)
xcrun notarytool submit dist/C-Suite-*.dmg \
  --apple-id "$APPLE_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_APP_PASSWORD" \
  --wait

# 3. Staple on success
xcrun stapler staple dist/C-Suite-*.dmg

# 4. Verify
spctl --assess --type install dist/C-Suite-*.dmg

# 5. Launch test — confirm no "developer cannot be verified" dialog
open dist/C-Suite-*.dmg
```

---

## Findings for Ch.11 setup runbook (preliminary)

1. **Bundle ID confirmed**: `com.classedu.csuite` — already in `electron-builder.yml`. Ch.11 must use this exact ID when registering with Apple Developer portal (Certificates, Identifiers & Profiles).
2. **Entitlements are already wired**: Both `entitlements` and `entitlementsInherit` paths are set in `electron-builder.yml`. Ch.11's `afterSign` hook via `@electron/notarize` will pick them up automatically.
3. **`notarize:` key deliberately absent**: The manual smoke uses `notarytool` directly. Ch.11 switches to `@electron/notarize` in `afterSign: scripts/notarize.cjs`. The commented-out line in `electron-builder.yml` documents the intent — Ch.11 just uncomments it.
4. **No Mac developer certificates verified yet**: Ch.11 must confirm a valid "Developer ID Application" cert is in the keychain before the automated pipeline can sign + notarize.
5. **`apps/main/build/`**: Electron-builder looks for entitlements relative to the `main` package root, not the repo root. The path `build/entitlements.mac.plist` resolves to `apps/main/build/entitlements.mac.plist`. This is correct but non-obvious — document in Ch.11 runbook.
