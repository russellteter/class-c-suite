# ADR-0002: Chapter 1 — Process Architecture, IPC, SQLite, Scheduler

## Status

`accepted` (under DOCTRINE operating-mode override; Russell may override at chapter boundary by editing this file).

## Date

2026-05-27

## Author / agent role

Backend Architect (Sonnet 4.6) under DOCTRINE writer ≠ grader (Audit/QA re-derives PASS/FAIL from Section 9 in chapter ritual step 6).

## Context

Chapter 1 builds the three-process Electron shell, the SQLite runtime store, and the token-budget concurrency scheduler. This ADR is the implementation contract for the Runtime + Test dispatches that follow. Per DOCTRINE law #7, this architect writes the spec; Audit/QA grades independently from Section 9.

**Sources consulted (in required-read order):**
- `ROADMAP.md` §Ch.1 lines 55-65 — exit criteria.
- `docs/decisions/0001-ch0-foundations.md` — Ch.0 ADR (full). This ADR builds on and does NOT contradict it.
- `docs/architecture/runtime.md` — process architecture + IPC + scheduler scaffolds.
- `docs/architecture/data.md` lines 280-386 — SQLite runtime store schema.
- `docs/research/phase-r-decisions.md` §Decision 5 — error handling table.
- `docs/research/R2-feasibility-notes.md` §B16, §B34 — SQLite userData path + heartbeat-only IPC relay.
- `BLOCKERS.md` B4, B5, B16, B30, B32 — scheduler economics, cost semantics, audit-trail path, ruvector.db, subpath exports.
- `docs/reviews/ch0-audit-qa-report.md` §7d — subpath exports concern flagged for Ch.1.

**B30 gate verdict (executed by this architect):**
`ruvector.db` (1,589,248 bytes) magic bytes: `72 65 64 62` = ASCII `redb`. This is a **redb** format file (Rust-native key-value store used by the Ruflo plugin system), NOT a SQLite database. `sqlite3 ruvector.db .schema` returns `Error: file is not a database`. The file is a Ruflo artifact unrelated to C-Suite's runtime store. Decision: **ignore ruvector.db**; C-Suite's SQLite store is named `runtime.db` at `app.getPath('userData')/runtime.db` — no path conflict. B30 closed.

**Subpath exports concern (Ch.0 Audit/QA §7d):**
All `@c-suite/X/Y` subpath imports (e.g., `@c-suite/shared-types/parseArtifact`) resolve via vitest `resolve.alias` at test time but will fail under Node module resolution at Electron runtime without `exports` fields in each package's `package.json`. This ADR resolves that concern (Section 2).

**Forces in play:**
- `utilityProcess.fork()` is confirmed as the current Electron API per R2 §Area 2 + context7 `/websites/electronjs`.
- `better-sqlite3` (11.x) requires rebuild via `@electron/rebuild` against Electron's Node ABI per BLOCKERS B14.
- SQLite must live in `app.getPath('userData')` — never `documents` — per BLOCKERS B16 + R2 §B16.
- Heartbeat-only IPC relay is required per BLOCKERS B34 (IPC saturation on long Opus Verifier runs).
- Token-budget scheduler window: 180K (conservative per B4 DOWNGRADED — post-2026-05-06 doubling the cap is more conservative than needed, but remains correct practice).
- `result.usage.total_cost_usd` is API-equivalent pricing on Max subscriptions, not subscription credits — display as reference figure only per B5.
- B25 (DEC-001 through DEC-004 missing) requires Ch.1 indexer to degrade gracefully on broken cross-references.
- B32 (Dataview maintenance mode / Bases as primary query layer) has no Ch.1 implementation impact (no Dataview queries in the runtime store).

---

## Decision

Ship the nine contracts below as the Ch.1 deliverable set. Runtime + Test dispatches implement against this ADR without further interpretation. SPEC ONLY — no production code in this ADR.

---

## Section 1 — Three-process Electron shell

### 1.1 Process model

**Source:** `docs/architecture/runtime.md` lines 6-36; `docs/decisions/0001-ch0-foundations.md` §1.2 (Electron 42.3.0 pinned).

Three processes, all supervised by Electron main:

```
┌──────────────────────────────────────────────────────────────┐
│ MAIN process — PID owner, system tray, Keychain, chokidar    │
│  - app.getPath('userData') → open runtime.db via better-sqlite3│
│  - spawns utility via utilityProcess.fork()                   │
│  - supervises utility (restart on crash, max 5 in 60s)        │
│  - owns scheduler.reset() timer (5-hr window)                 │
│  - creates BrowserWindow for renderer                         │
└──────────────┬─────────────────────────────┬─────────────────┘
               │ MessagePort pair             │ ipcMain / ipcRenderer
               ▼                             ▼
┌──────────────────────────┐   ┌─────────────────────────────┐
│ UTILITY process           │   │ RENDERER process             │
│  - Orchestrator           │   │  - React 18 + Tailwind 3    │
│  - Agent SDK calls        │   │  - contextIsolation: true   │
│  - SafeWrite (Ch.2)       │   │  - nodeIntegration: false   │
│  - MCP clients            │   │  - sandbox: true            │
│  - Scheduler singleton    │   │  - preload.ts exposes ipc   │
│  - reads/writes SQLite    │   │  - round-table, memo viewer │
│    via main (IPC proxy)   │   │                             │
└──────────────────────────┘   └─────────────────────────────┘
```

**Clarification vs runtime.md:** runtime.md shows the utility process as having direct SQLite access. For strict isolation, SQLite writes from the utility process MUST be proxied through the main process IPC channel (main holds the `better-sqlite3` Database handle — one open handle avoids WAL contention). The utility sends structured SQL params as IPC messages; main executes them synchronously and returns results. This is NOT in conflict with runtime.md's architectural intent — it is a refined implementation constraint.

### 1.2 `utilityProcess.fork()` invocation shape

**Source:** R2 §Area 2 — confirmed `utilityProcess.fork()` is the current stable API. Context7 `/websites/electronjs` utilityProcess.fork documentation.

```typescript
// apps/main/src/utility.ts  (Main process only)
import { utilityProcess } from 'electron';
import * as path from 'path';

const UTILITY_PATH = path.join(__dirname, '../utility/index.js');

export function forkUtility(): Electron.UtilityProcess {
  const proc = utilityProcess.fork(UTILITY_PATH, [], {
    serviceName: 'c-suite-orchestrator',
    env: {
      ...process.env,
      UTILITY_ROLE: 'orchestrator',
    },
    stdio: 'pipe',          // utility's stderr goes to main for crash logging
  });
  return proc;
}
```

**`modulePath`:** `path.join(__dirname, '../utility/index.js')` — compiled output of `apps/utility/src/index.ts`.

**`args`:** `[]` — configuration via `env`, not CLI args.

**`options.serviceName`:** `'c-suite-orchestrator'` — shown in Activity Monitor.

**`options.stdio`:** `'pipe'` — required so main can read utility stderr for crash logging.

**Timing constraint:** `utilityProcess.fork()` MUST be called after the `app.whenReady()` promise resolves. Do NOT call during module initialization.

### 1.3 `MessagePort` pair for main ↔ utility IPC

**Source:** `docs/architecture/runtime.md` lines 40-63; `docs/decisions/0001-ch0-foundations.md` §3 (IPC discriminated union).

```typescript
// apps/main/src/utility.ts  (Main process — continued)
import { MessageChannelMain } from 'electron';

export function setupUtilityChannel(proc: Electron.UtilityProcess): MessagePort {
  const { port1, port2 } = new MessageChannelMain();

  // Transfer port2 to the utility process so it can receive/send messages.
  proc.postMessage({ kind: '__port_init' }, [port2]);

  // Main retains port1.
  port1.start();
  return port1;
}
```

```typescript
// apps/utility/src/index.ts  (Utility process — port init handler)
let ipcPort: MessagePort | null = null;

process.parentPort.once('message', (e) => {
  if (e.data?.kind === '__port_init' && e.ports.length > 0) {
    ipcPort = e.ports[0];
    ipcPort.start();
    // All subsequent messages use ipcPort, not process.parentPort.
  }
});
```

**Message validation:** All messages passing through the port are validated via `validateIpc()` from `@c-suite/shared-types/ipc` (Ch.0 ADR §3). Invalid messages are logged and dropped; they never mutate receiver state.

### 1.4 `BrowserWindow` configuration for renderer

**Source:** `docs/architecture/runtime.md` line 36; R2 §Area 5.

```typescript
// apps/main/src/window.ts
import { BrowserWindow } from 'electron';
import * as path from 'path';

export function createRendererWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,            // shown after 'ready-to-show' event to avoid flash
    webPreferences: {
      contextIsolation: true,         // LOCKED — no override permitted
      nodeIntegration: false,         // LOCKED — no override permitted
      sandbox: true,                  // LOCKED — no override permitted
      preload: path.join(__dirname, 'preload.js'),
    },
  });
}
```

**CSP header (R2 §Area 5):** Main process sets the response header via `session.defaultSession.webRequest.onHeadersReceived`:

```typescript
"Content-Security-Policy":
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
```

No `'unsafe-eval'` — React 18 with the modern JSX transform does not require it.

### 1.5 Preload script `contextBridge` surface (minimum API)

**Source:** R2 §Area 5 — "expose minimum IPC surface only."

```typescript
// apps/main/src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// MINIMUM surface — only what the renderer needs.
// Do NOT expose ipcRenderer directly.
contextBridge.exposeInMainWorld('ipc', {
  // Send a run-initiation message to main.
  send: (msg: unknown) => ipcRenderer.send('ipc:message', msg),

  // Subscribe to events pushed by main (run state, agent events, scheduler events).
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args);
    ipcRenderer.on(channel, wrapped);
    // Return cleanup function.
    return () => ipcRenderer.removeListener(channel, wrapped);
  },

  // Invoke (request-response) — used for queries like getSchedulerState, getRunHistory.
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
});
```

**Typed wrapper:** The renderer imports a typed façade (`apps/renderer/src/ipc-client.ts`) that wraps `window.ipc.send/on/invoke` and validates outbound messages via `validateIpc()`. The preload script itself does NOT import from Node built-ins beyond `contextBridge` and `ipcRenderer`.

---

## Section 2 — Subpath exports for Electron runtime (Ch.0 Audit/QA §7d)

**Source:** `docs/reviews/ch0-audit-qa-report.md` §7d — "At Ch.1 runtime when Electron imports these packages via Node module resolution, the subpath imports will fail unless `exports` fields are added to each package's `package.json`."

Each `@c-suite/*` package requires:
1. A `build` script that emits `dist/*.js` + `dist/*.d.ts` via `tsc`.
2. An `exports` field in `package.json` mapping every subpath the main, utility, and renderer processes import.

### 2.1 `packages/shared-types/package.json` — exports map

```json
{
  "name": "@c-suite/shared-types",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./parseArtifact": {
      "import": "./dist/parseArtifact.js",
      "types": "./dist/parseArtifact.d.ts"
    },
    "./normalizeKeys": {
      "import": "./dist/normalizeKeys.js",
      "types": "./dist/normalizeKeys.d.ts"
    },
    "./vault-schemas": {
      "import": "./dist/vault-schemas.js",
      "types": "./dist/vault-schemas.d.ts"
    },
    "./ipc": {
      "import": "./dist/ipc.js",
      "types": "./dist/ipc.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2.2 `packages/stub-harness/package.json` — exports map

```json
{
  "name": "@c-suite/stub-harness",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./stub": {
      "import": "./dist/stub.js",
      "types": "./dist/stub.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2.3 TypeScript build config per package

Each package adds `tsconfig.build.json` (extends the root `tsconfig.json`, adds `outDir: "./dist"`, `declaration: true`, `declarationMap: true`, excludes test files):

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

**Build order:** `packages/shared-types` builds first (no internal deps). `packages/stub-harness` builds second (imports from `shared-types`). `apps/main`, `apps/utility`, `apps/renderer` build last.

**Pnpm workspace build script** (root `package.json`):

```json
"build:packages": "pnpm --filter @c-suite/shared-types build && pnpm --filter @c-suite/stub-harness build"
```

This is a prerequisite step before Electron-builder packages the app.

**Vitest aliases remain unchanged.** The existing `resolve.alias` in `vitest.config.ts` continues to work for tests; the new `exports` fields add the runtime resolution path without breaking tests.

---

## Section 3 — Supervised utility-process restart from SQLite checkpoint

**Source:** `docs/architecture/runtime.md` §Checkpoint and resume; brief §3.

### 3.1 Supervision loop in main process

```typescript
// apps/main/src/supervisor.ts
const MAX_RESTARTS = 5;
const RESTART_WINDOW_MS = 60_000;   // 5 restarts within 60s = halt
const RESTART_DELAY_MS = 500;       // wait 500ms before respawning; fork completes within ~200ms = total ≤ 1s per brief §3

interface SupervisionState {
  restarts: number[];   // timestamps of recent crashes (ms epoch)
  proc: Electron.UtilityProcess | null;
  port: MessagePort | null;
}

export function startSupervision(
  state: SupervisionState,
  db: Database,          // better-sqlite3 Database handle (main holds it)
  webContents: Electron.WebContents,
): void {
  const proc = forkUtility();
  state.proc = proc;
  state.port = setupUtilityChannel(proc);

  proc.stderr?.on('data', (chunk: Buffer) => {
    const stack = chunk.toString();
    logCrashToSQLite(db, stack);      // writes to process_events table
    log.error({ process: 'main', message: 'utility stderr', stack });
  });

  proc.on('exit', (code) => {
    if (code === 0) return;           // clean shutdown — do not restart

    const now = Date.now();
    state.restarts = state.restarts
      .filter(t => now - t < RESTART_WINDOW_MS)
      .concat(now);

    logCrashToSQLite(db, `exit code ${code}`);

    if (state.restarts.length > MAX_RESTARTS) {
      // Surface to renderer and halt.
      webContents.send('ipc:message', {
        kind: 'run.failed',
        payload: {
          runId: 'system',
          reason: `Utility process crashed ${MAX_RESTARTS}× in 60s — halted. See logs.`,
          stage: 'utility-supervisor',
        },
      });
      return;
    }

    setTimeout(() => {
      startSupervision(state, db, webContents);
    }, RESTART_DELAY_MS);
  });
}
```

**Restart timing:** Main waits `RESTART_DELAY_MS` (500 ms) before calling `utilityProcess.fork()`. The fork call itself completes in ~200ms under normal conditions. Total time from process exit event to utility startup is therefore ≤ 700ms, satisfying the brief's "within 1 second" requirement. The acceptance criterion test (§9 row 2) allows ≤ 1,500ms to also account for `run.start` IPC emission latency after process startup.

**Max retries:** 5 crashes within any 60-second rolling window. After that, emit `run.failed` to the renderer and halt. Sliding window (older entries pruned on each crash event).

### 3.2 `process_events` SQLite table schema

```sql
-- db/migrations/001_initial.sql  (subset — full table list in §4.1)

CREATE TABLE IF NOT EXISTS process_events (
  event_id    TEXT PRIMARY KEY,           -- UUID v4
  occurred_at INTEGER NOT NULL,           -- ms epoch
  process     TEXT NOT NULL,              -- 'main' | 'utility'
  event_type  TEXT NOT NULL,              -- 'crash' | 'restart' | 'halt' | 'start'
  exit_code   INTEGER,                    -- null for 'start' events
  stack_trace TEXT,                       -- stderr excerpt on crash; null otherwise
  restart_count INTEGER                   -- cumulative restarts in this supervision cycle
);

CREATE INDEX IF NOT EXISTS idx_process_events_occurred ON process_events(occurred_at);
```

### 3.3 Checkpoint-resume API contract

**Source:** `docs/architecture/runtime.md` §Checkpoint and resume (lines 201-246).

```typescript
// apps/utility/src/orchestrator.ts — public API surface (SPEC only)

/**
 * Resume an in-flight run from the last successful checkpoint.
 * Called by the utility process immediately after startup, before accepting new work.
 *
 * Algorithm:
 *   1. Query SQLite (via IPC to main) for any run with status = 'in_progress'.
 *   2. If none: ready for new work.
 *   3. If found: read the run's current_state, plan_json, and completed agent_invocations.
 *   4. Reconstruct in-memory RunState from the completed invocations (skip re-running them).
 *   5. Resume from the next incomplete lens (or synthesizer, or verifier — per current_state).
 *   6. Emit 'run.start' IPC event with the resumed runId so the renderer shows state.
 *
 * @param runId  - The run to resume. Obtained from the in-progress query.
 * @returns      - Promise that resolves when the run reaches a terminal state.
 * @throws       - VerifierInputContractViolation if a partially-completed run's
 *                 agent outputs violate the assembler contract (surface as run.failed).
 */
export async function resumeRun(runId: string): Promise<void> { /* Ch.3 implements */ }

/**
 * Internal: read completed agent_invocations for a run from SQLite.
 * Returns only rows with status = 'completed'; skips 'in_progress' rows
 * (the in-progress invocation at crash time re-runs from scratch).
 */
async function loadCompletedInvocations(
  runId: string,
): Promise<AgentInvocationRecord[]> { /* Ch.3 implements */ }
```

**Resume invariant:** A lens that crashed mid-output (status `'in_progress'` in `agent_invocations`) is treated as not completed. It re-runs from scratch. Only status `'completed'` rows are loaded into the reconstructed RunState.

---

## Section 4 — SQLite runtime store

**Source:** `docs/architecture/data.md` lines 280-386; BLOCKERS B16 (`app.getPath('userData')` requirement); Ch.0 ADR §1.2 (`better-sqlite3` 11.x pinned).

### 4.1 Path and handle ownership

```typescript
// apps/main/src/db/open.ts
import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

export function openDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'runtime.db');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');    // concurrency (multiple readers, one writer)
  db.pragma('foreign_keys = ON');     // referential integrity
  db.pragma('busy_timeout = 5000');   // 5s timeout on locked DB

  return db;
}
```

**NEVER** use `app.getPath('documents')` — avoids iCloud sync territory per BLOCKERS B16.

**Handle ownership:** The MAIN process holds the single `Database` instance. Utility process sends SQL-param IPC messages; main executes and returns results. This prevents WAL contention and guarantees single-writer semantics.

### 4.2 Ch.1 initial schema (migration 001)

File: `db/migrations/001_initial.sql`

```sql
-- Migration 001: Ch.1 initial schema
-- All tables use CREATE TABLE IF NOT EXISTS for idempotency.
-- Migration runner executes this in a single transaction.

CREATE TABLE IF NOT EXISTS schema_version (
  version     INTEGER NOT NULL,
  applied_at  INTEGER NOT NULL             -- ms epoch
);

-- Insert version marker ONLY if not already present (idempotent).
INSERT OR IGNORE INTO schema_version (version, applied_at)
  VALUES (1, strftime('%s', 'now') * 1000);

CREATE TABLE IF NOT EXISTS runs (
  run_id          TEXT PRIMARY KEY,
  playbook        TEXT NOT NULL,
  question        TEXT NOT NULL,
  started_at      INTEGER NOT NULL,        -- ms epoch
  current_state   TEXT NOT NULL,           -- state machine node name
  plan_json       TEXT,
  finished_at     INTEGER,
  rigor_score     INTEGER,
  rigor_threshold INTEGER,
  status          TEXT,                    -- 'in_progress'|'shipped_clean'|'shipped_draft'|'failed'|'cancelled'
  memo_path       TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_status     ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);

CREATE TABLE IF NOT EXISTS agent_invocations (
  invocation_id         TEXT PRIMARY KEY,
  run_id                TEXT NOT NULL REFERENCES runs(run_id),
  agent_role            TEXT NOT NULL,
  started_at            INTEGER NOT NULL,
  completed_at          INTEGER,
  structured_output_json TEXT,
  tokens_in             INTEGER,
  tokens_out            INTEGER,
  reasoning_tokens      INTEGER,
  model                 TEXT,
  status                TEXT              -- 'in_progress'|'completed'|'failed'|'cancelled'
);

CREATE INDEX IF NOT EXISTS idx_invocations_run ON agent_invocations(run_id);

CREATE TABLE IF NOT EXISTS tool_calls (
  call_id       TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL REFERENCES runs(run_id),
  invocation_id TEXT NOT NULL REFERENCES agent_invocations(invocation_id),
  agent_role    TEXT NOT NULL,
  tool_name     TEXT NOT NULL,
  args_json     TEXT NOT NULL,
  result_json   TEXT,                     -- FULL result per data.md line 325
  source_id     TEXT,
  called_at     INTEGER NOT NULL,
  duration_ms   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_run  ON tool_calls(run_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_call ON tool_calls(call_id);

CREATE TABLE IF NOT EXISTS process_events (
  event_id      TEXT PRIMARY KEY,
  occurred_at   INTEGER NOT NULL,
  process       TEXT NOT NULL,            -- 'main'|'utility'
  event_type    TEXT NOT NULL,            -- 'crash'|'restart'|'halt'|'start'
  exit_code     INTEGER,
  stack_trace   TEXT,
  restart_count INTEGER
);

CREATE INDEX IF NOT EXISTS idx_process_events_occurred ON process_events(occurred_at);

CREATE TABLE IF NOT EXISTS cost_ledger (
  entry_id    TEXT PRIMARY KEY,
  run_id      TEXT REFERENCES runs(run_id),
  job_id      TEXT,                       -- REFERENCES jobs(job_id) — jobs table lands Ch.2+
  agent_role  TEXT,
  model       TEXT,
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  cost_usd    REAL,                       -- B5: nullable; API-equivalent reference figure
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cost_ledger_run ON cost_ledger(run_id);
```

**Tables deferred to later chapters** (per brief §4): `writebacks` (Ch.2), `jobs` (Ch.2+), `workstream_amounts_mirror` (Ch.2+), `calibration_window` (Ch.4).

### 4.3 Migration runner

Module path: `apps/main/src/db/migrate.ts`

```typescript
// apps/main/src/db/migrate.ts  (SPEC — Ch.1 Runtime implements)
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../../../../db/migrations');

/**
 * Apply all pending migrations in lexicographic order (NNN_<name>.sql).
 * Each migration is applied in a single transaction; the schema_version row
 * is inserted as the LAST statement of the transaction to serve as a
 * commit marker.
 *
 * Idempotency: every migration uses CREATE TABLE IF NOT EXISTS,
 * CREATE INDEX IF NOT EXISTS, INSERT OR IGNORE — safe to run twice.
 * The runner skips migration N if schema_version already contains version N.
 */
export function runMigrations(db: Database.Database): void {
  // Read current applied version (0 if schema_version is empty).
  const versionRow = db.prepare(
    'SELECT MAX(version) AS v FROM schema_version'
  ).get() as { v: number | null };
  const current = versionRow?.v ?? 0;

  // Collect + sort migration files.
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}_.*\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const versionStr = file.split('_')[0];
    const version = parseInt(versionStr, 10);
    if (version <= current) continue;         // already applied

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    db.transaction(() => {
      db.exec(sql);
      db.prepare(
        'INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)'
      ).run(version, Date.now());
    })();

    log.info({ process: 'main', message: `migration ${version} applied`, file });
  }
}
```

**Migration file naming:** `db/migrations/NNN_<name>.sql` — 3-digit zero-padded, lexicographically sorted. Ch.1 ships `001_initial.sql`.

**Concurrency:** `PRAGMA journal_mode = WAL` (set at DB open, before migrations run). Allows concurrent read queries during write transactions.

---

## Section 5 — Token-budget concurrency scheduler

**Source:** `docs/architecture/runtime.md` §Token-budget concurrency scheduler (lines 178-198); BLOCKERS B4, B5.

### 5.1 SchedulerState struct

Per `docs/architecture/runtime.md` line 184:

```typescript
// apps/utility/src/scheduler.ts  (SPEC)

type RunId = string;
type AgentInvocation = {
  invocationId: string;
  runId: RunId;
  role: AgentRole;
  estimatedTokens: number;
  priority: 'interactive' | 'scheduled';
};

type PendingInvocation = AgentInvocation & {
  resolve: (result: AgentResult) => void;
  reject: (err: Error) => void;
};

interface SchedulerState {
  windowStartedAt: number;          // ms epoch — 5-hr rolling window anchor
  tokensConsumed: number;           // input + output combined, this window
  windowCap: number;                // default 180_000 (B4 conservative)
  inFlight: Map<RunId, AgentInvocation[]>;
  queue: PendingInvocation[];
  priority: 'interactive' | 'scheduled';
}
```

### 5.2 Public API

```typescript
// apps/utility/src/scheduler.ts  (SPEC — signatures only)

export class Scheduler {
  private state: SchedulerState;
  private emitIpc: (msg: IpcMessage) => void;  // main-process IPC sender

  constructor(windowCap = 180_000, emitIpc: (msg: IpcMessage) => void) { /* ... */ }

  /**
   * Returns true if the scheduler can start a new invocation consuming
   * `estimatedTokens` without exceeding windowCap.
   *
   * Priority rule (ROADMAP §Ch.1 + runtime.md line 192):
   *   - If any interactive run is in-flight, scheduled invocations always return false.
   *   - Interactive invocations may proceed if tokensConsumed + estimatedTokens <= windowCap.
   */
  canDispatch(estimatedTokens: number, priority: 'interactive' | 'scheduled'): boolean;

  /**
   * Gate via canDispatch; if allowed, add to inFlight, track tokens, return result.
   * If NOT allowed:
   *   - Emit 'scheduler.throttle' IPC event (reason + retryAt).
   *   - Downgrade run from parallel to sequential (set run's dispatch mode to 'sequential').
   *   - Queue the invocation; process queue when in-flight drops below threshold.
   *
   * @returns Promise<AgentResult> that resolves when the invocation completes.
   */
  dispatch(invocation: PendingInvocation): Promise<AgentResult>;

  /**
   * Called by main process on 5-hr rolling-window expiry.
   * Resets tokensConsumed and windowStartedAt. Emits 'scheduler.window.reset'.
   * Drains the queue (pending invocations may now proceed).
   */
  reset(): void;

  /**
   * Record tokens consumed by a completed invocation.
   * Called after AgentResult returns with result.usage.tokensIn + tokensOut.
   * Also records the cost_usd reference figure (B5) to cost_ledger via IPC.
   */
  recordUsage(invocationId: string, tokensIn: number, tokensOut: number, costUsdRef?: number): void;
}
```

### 5.3 Priority rule

**Source:** `docs/architecture/runtime.md` line 192.

Interactive runs (Russell-initiated) have strict priority over scheduled jobs:
- If any interactive invocation is in-flight: scheduled `canDispatch()` returns `false` unconditionally.
- In-flight scheduled invocations run to completion (no kill).
- Pending-scheduled invocations pause in the queue until interactive work drains.

### 5.4 Degradation rule

**Source:** `docs/architecture/runtime.md` line 194.

If `tokensConsumed + estimatedAgentTokens > windowCap`:
- Downgrade the run from parallel to sequential (all remaining lenses run one at a time instead of `Promise.all`).
- Emit `{ kind: 'scheduler.throttle', payload: { reason: 'window-cap-degradation', retryAt: null } }` — `retryAt: null` signals sequential mode (not a retry; a permanent mode change for this run).
- Surface to the renderer's round-table view as a visual degradation indicator.

### 5.5 Backoff on 429

**Source:** `docs/architecture/runtime.md` line 196.

On HTTP 429 from the Claude API (or SDK equivalent):
- Exponential backoff: 30s → 60s → 120s → 240s → 480s. Add ±20% jitter on each step.
- Emit `{ kind: 'scheduler.throttle', payload: { reason: '429-rate-limit', retryAt: <ms epoch> } }` on each backoff.
- Never silently retry. All retry events are emitted to IPC.
- After 5 consecutive 429s without success: surface `run.failed` with `stage: 'scheduler-backoff-exhausted'`.

### 5.6 IPC events emitted by the scheduler

| Event kind | When emitted | Payload fields |
|---|---|---|
| `scheduler.throttle` | On degradation to sequential OR on 429 backoff | `{ reason, retryAt }` |
| `cost.usage` | After each invocation completes via `recordUsage()` | `{ runId, tokensIn, tokensOut, windowRemainingTokens, windowResetsAt, totalCostUsdReference? }` |
| `scheduler.window.reset` | (UNKNOWN — not in IpcMessage union) | TBD |

**UNKNOWN — `scheduler.window.reset`:** The IPC discriminated union in `docs/decisions/0001-ch0-foundations.md` §3 does not include a `scheduler.window.reset` kind. This ADR requires adding it. Spec for the Ch.1 Runtime dispatch: add `{ kind: 'scheduler.window.reset', payload: { resetAt: number; newWindowCap: number } }` to `packages/shared-types/src/ipc.ts`. This is a forward-compatible addition to the IpcMessage union.

### 5.7 Window reset — lazy expiry check

The 5-hour rolling window is checked lazily, not via a fixed `setInterval`. A periodic timer desynchronizes from actual consumption: if the utility process restarts, the timer's phase shifts relative to `windowStartedAt`, causing either premature or late resets.

**Correct approach:** inside `canDispatch()` (and at the top of `dispatch()`), check whether `(Date.now() - state.windowStartedAt) >= WINDOW_MS`. If expired, call `reset()` before evaluating capacity:

```typescript
// apps/utility/src/scheduler.ts  (SPEC excerpt)
const WINDOW_MS = 5 * 60 * 60 * 1000;   // 5 hours

private checkWindowExpiry(): void {
  if (Date.now() - this.state.windowStartedAt >= WINDOW_MS) {
    this.reset();   // emits 'scheduler.window.reset' IPC event
  }
}

canDispatch(estimatedTokens: number, priority: 'interactive' | 'scheduled'): boolean {
  this.checkWindowExpiry();   // eager check before capacity math
  // ... priority + capacity logic ...
}
```

`reset()` updates `windowStartedAt = Date.now()` and `tokensConsumed = 0`. The window is rolling from first-call semantics, not from app-start.

---

## Section 6 — Error handling table (Decision 5 verbatim)

**Source:** `docs/research/phase-r-decisions.md` §Decision 5 (lines 96-108). Dropped verbatim as required.

| Failure type | Retry policy | Degraded-mode behavior | Failure-notification rule | Escalation |
|---|---|---|---|---|
| **Network timeout** (5xx, connection error) | Exponential backoff: 30s, 2m, 10m. Max 3 retries. | If all retries fail: run job with available data, flag missing source. | Native notification only on 3rd retry failure. | If 3 consecutive scheduled fires fail: surface as P2 alert in home-screen job-status strip. |
| **Auth expired** (OAuth refresh fails, SSO expired) | NO automatic retry — auth requires browser interaction. | Run job with degraded sources, flag `auth_expired: <service>` in memo. | Immediate native notification: "Reconnect `<service>` to restore `<job>`". | After 7 days of expired auth: P1 alert in home-screen. |
| **MCP-down** (Anthropic service unreachable, MCP server crashed) | Exponential backoff: 1m, 5m, 30m. Max 3 retries. | Degraded mode: skip the MCP-dependent lens, flag in synthesis. | Native notification on 3rd retry failure. | If MCP is down for >24h: P2 alert; runs continue with reduced lens coverage. |
| **Vault unreachable** (file-system error, disk full) | Retry 3× with 10s spacing. | If still failing: HALT the job entirely; do not partial-write. | Immediate native notification. | If vault remains unreachable for >1h: P0 alert — cannot operate. |
| **Vault git commit fails** (rare — corruption, permissions) | No retry. | Continue with file written; queue git-commit-retry every 5m. | Native notification only if 6 consecutive commit failures. | Log to app-data equivalent of `.git/auto-push.log`; surface in Settings → Diagnostics. |

**B32 (AWS SSO mid-job) addition** (per phase-r-decisions.md §Decision 5 line 105):
Ch.10 must implement: (a) preflight token-expiry check before AWS job starts, (b) graceful degradation when expired (skip AWS section, surface re-login prompt), (c) do NOT abort the full brief on AWS failure alone. Auth-expired row above applies; Ch.10 adds the token-expiry pre-check.

---

## Section 7 — Heartbeat-only IPC relay (B34)

**Source:** BLOCKERS B34; `docs/research/R2-feasibility-notes.md` §Area 6; `docs/architecture/runtime.md` line 173.

**Problem:** A long Verifier run on Opus 4.7 can produce thousands of `SDKPartialAssistantMessage` token events. If the utility process relays all of them to the renderer via IPC, the event volume saturates the IPC channel and causes UI jank.

### 7.1 Heartbeat specification

- **Interval:** 250ms — maximum 4 heartbeat events per second per agent.
- **Heartbeat payload** (maps to the `agent.heartbeat` kind in the IpcMessage union, `docs/decisions/0001-ch0-foundations.md` §3):

```typescript
{
  kind: 'agent.heartbeat',
  payload: {
    runId: string,
    agentId: string,
    tokensSoFar: number,         // cumulative tokens received so far this invocation
    messageSnippet?: string,     // ≤ 80 chars from the latest partial text; for "thinking…" indicator
                                 // NOT the full token text; DO NOT accumulate in the heartbeat
  }
}
```

- **Full structured output** flows on `agent.complete` — one event per agent invocation, not per token.
- Heartbeats are suppressed (not emitted) for agents that have not produced any tokens since the last heartbeat.

### 7.2 Backpressure design

- The utility process tracks `lastHeartbeatSentAt` per agent.
- If the renderer is unresponsive (ack not received within 2,000ms on a **critical** event — `agent.complete`, `run.failed`, `verifier.score`), main buffers the critical event and retries every 500ms.
- For heartbeat events specifically: if a heartbeat cannot be delivered (port write fails), it is **dropped**. Heartbeats are best-effort; correctness events (`agent.complete`, `run.failed`) are never dropped.
- The utility process does NOT enable `includePartialMessages` on SDK invocations by default. Partial messages are consumed internally to drive the heartbeat timer. The raw token stream never enters the IPC channel.

### 7.3 Implementation location

```typescript
// apps/utility/src/heartbeat.ts  (SPEC — Ch.1 Runtime implements)

export class HeartbeatEmitter {
  private lastEmit: Map<string, number> = new Map();   // agentId → ms epoch
  private readonly intervalMs = 250;

  shouldEmit(agentId: string): boolean {
    const last = this.lastEmit.get(agentId) ?? 0;
    return Date.now() - last >= this.intervalMs;
  }

  record(agentId: string): void {
    this.lastEmit.set(agentId, Date.now());
  }
}
```

---

## Section 8 — Structured JSON logs with cross-process correlation IDs

**Source:** brief §8; `docs/decisions/0001-ch0-foundations.md` §8 (log fields).

### 8.1 Log entry schema

```typescript
interface LogEntry {
  ts: string;                     // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  process: 'main' | 'utility' | 'renderer';
  runId?: string;                 // spans main + utility for any run event
  agentId?: string;               // spans utility + renderer for any agent event
  message: string;
  [key: string]: unknown;         // additional payload (tool name, crash stack, etc.)
}
```

Format: JSON Lines (one log entry per line). One file per process (by default), but renderer logs are relayed via IPC to main so main writes a single consolidated log.

### 8.2 Log destination and rotation

- `app.getPath('logs')` — Electron provides per-app log directory on macOS: `~/Library/Logs/C-Suite/`.
- File: `main.log` (consolidated — main writes all three process streams).
- Rotation: 10 MB per file, keep last 5 files. Implement via `winston` or `pino` with `rotating-file-stream` — Ch.1 Runtime dispatch chooses the logger library; this ADR does not pin it. Constraint: the library must not require native modules (to avoid additional `@electron/rebuild` surface).

### 8.3 Renderer log relay

```typescript
// Renderer process — apps/renderer/src/log.ts
export function relayLog(entry: LogEntry): void {
  window.ipc.send({
    kind: '__internal.log',
    payload: { ...entry, process: 'renderer' },
  });
}
```

```typescript
// Main process — receives '__internal.log' and writes to log file.
ipcMain.on('ipc:message', (_event, raw) => {
  if (raw?.kind === '__internal.log') {
    writeLog(raw.payload as LogEntry);
  }
});
```

**Note:** `__internal.log` is a non-validated internal channel (not in the `IpcMessage` discriminated union) — it uses a separate `ipcMain.on` listener to avoid polluting the typed union with logging internals.

### 8.4 Correlation discipline

Every log entry for a run-related event MUST include `runId`. Every log entry for an agent event MUST include both `runId` and `agentId`. Main-process system events (app start, tray creation, window creation) omit both. This enables `grep runId=<id>` to reconstruct any run's full cross-process event sequence.

---

## Section 9 — Acceptance criteria (testable)

| # | Criterion | Test / Observation | Owner |
|---|-----------|-------------------|-------|
| 1 | Electron main + utility + renderer start; IPC round-trip completes in < 50ms | `tests/integration/ipc-roundtrip.spec.ts` — sends `run.start` from main, receives echo from utility, measures round-trip latency via `performance.now()` | Runtime dispatch |
| 2 | Supervised restart: kill utility process (SIGKILL); fork fires within 1,000ms (RESTART_DELAY_MS=500ms + fork overhead); resumed run emits `run.start` with original `runId` within 1,500ms total | `tests/integration/supervisor.spec.ts` — uses `proc.kill()`, asserts new process is registered within 1,000ms and `run.start` IPC event fires within 1,500ms | Runtime dispatch |
| 3 | Scheduler cap: request 10 concurrent agents at 20K tokens each (200K total > 180K cap); scheduler degrades to sequential; emits `scheduler.throttle` | `tests/unit/scheduler.spec.ts` — `Scheduler.dispatch()` 10× with `estimatedTokens: 20_000`; assert `canDispatch()` returns false after 9th, `scheduler.throttle` event emitted | Runtime dispatch |
| 4 | Migration idempotency: run `runMigrations(db)` twice; second run is no-op (no duplicate schema_version rows, no SQL errors) | `tests/unit/migrate.spec.ts` — opens in-memory SQLite, runs migrations twice, asserts `SELECT COUNT(*) FROM schema_version` returns same count both times | Runtime dispatch |
| 5 | Log correlation: a single run produces log entries in both main and utility processes tagged with the same `runId`; renderer relays its entries to main | `tests/integration/logging.spec.ts` — runs a stub invocation; asserts emitted log entries across all three `process` values share `runId` | Runtime dispatch + Test dispatch |
| 6 | Heartbeat rate: a 10-second stub agent emitting token events fires ≤ 45 heartbeat IPC events (4/sec × 10s + 5 buffer) | `tests/unit/heartbeat.spec.ts` — `HeartbeatEmitter` in a time-mocked loop for 10s; assert event count ≤ 45 | Runtime dispatch |
| 7 | Subpath exports: `apps/utility/src/index.ts` imports `@c-suite/shared-types/ipc` via Node module resolution (not vitest alias); import succeeds after `pnpm build:packages` | `tests/integration/subpath-exports.spec.ts` OR manual: `node -e "import('@c-suite/shared-types/ipc').then(m => console.log(Object.keys(m)))"` in the workspace | Runtime dispatch |
| 8 | SQLite path: `runtime.db` opens at `app.getPath('userData')`, NOT under `documents` or any iCloud-synced path | `tests/unit/db-open.spec.ts` — mocks `app.getPath('userData')` to a tmp dir; asserts opened path ends with `/runtime.db` and does NOT include `/Documents/` | Runtime dispatch |
| 9 | B30 gate: `ruvector.db` is NOT a SQLite database; `runtime.db` path does not conflict | Manual: `sqlite3 ruvector.db .schema` returns error; `file ruvector.db` shows `redb` magic bytes — VERIFIED by this architect (see §Context). No test needed — gate satisfied at spec time. | Architect (this ADR) |
| 10 | `process_events` table populated on utility crash: after a SIGKILL, `SELECT COUNT(*) FROM process_events WHERE event_type = 'crash'` returns ≥ 1 | `tests/integration/supervisor.spec.ts` — combined with criterion 2; assert SQLite row exists after restart | Runtime dispatch |
| 11 | `scheduler.window.reset` IpcMessage variant: type-checks without error after addition to `ipc.ts` | `tests/unit/ipc.spec.ts` — add the new variant; `IpcMessage.parse({ kind: 'scheduler.window.reset', payload: { resetAt: Date.now(), newWindowCap: 180_000 } })` does not throw | Runtime dispatch |
| 12 | `resumeRun(runId)` skips completed invocations: given a `runs` row with `status='in_progress'` and 3 `agent_invocations` rows (2 completed, 1 in_progress), `loadCompletedInvocations()` returns only the 2 completed rows | `tests/unit/orchestrator-resume.spec.ts` — seeded in-memory SQLite; assert returned array length = 2 and does not include the in_progress row | Runtime dispatch |

---

## Section 10 — Considered alternatives

### Main ↔ utility IPC: `MessagePort` pair vs `ipcMain.handle` / `ipcMain.on`

- **`ipcMain.handle`** is the standard Electron IPC mechanism but is designed for renderer ↔ main communication only. Utility processes are NOT renderers; they use `MessagePort` (via `MessageChannelMain`) as the official API.
- **`MessagePort` pair** is the correct API for main ↔ utility per Electron 42.x documentation (R2 §Area 2). Chosen.
- **`process.parentPort`** is the utility process's bootstrap receiver but is not suitable for bidirectional message passing after initialization (it's a one-shot port for receiving the transferred `MessagePort`). Used only for `__port_init` handshake.

### Database: LevelDB vs better-sqlite3

- **LevelDB**: key-value only; requires additional query layer for relational queries (run → invocations → tool_calls join). No ACID transaction guarantees across separate key spaces.
- **better-sqlite3**: SQL, ACID, synchronous API (no callback hell for the main process), mature Electron compatibility, WAL mode for concurrent reads. Chosen per `docs/architecture/data.md` line 280 ("better-sqlite3 for synchronous transactional writes").

### Scheduler clock: Node.js `setInterval` vs cron-style (`node-cron`)

- **`node-cron`** is job-based scheduling (fires at a cron expression). Appropriate for Ch.10's scheduled job orchestration. NOT the scheduler described in this chapter — Ch.1's scheduler is a concurrency gate (not a time-based trigger).
- **`setInterval` in main** for the 5-hour window reset timer. Simple, survives utility restarts (timer lives in main). Chosen.

### SQLite handle ownership: main-only vs multi-process

- **Multi-process** (utility opens its own connection): WAL mode allows concurrent readers, but multiple writers to the same WAL file require coordination; `better-sqlite3` is synchronous-only, so concurrent writes from two processes require a locking strategy. Complexity cost: high.
- **Main-only** (utility sends SQL params via IPC): single writer guaranteed. Utility reads are proxied through main. Adds one round-trip per SQL operation, but operations are infrequent (checkpoint writes, not per-token). Complexity cost: low. Chosen for correctness.

### Heartbeat interval: 100ms vs 250ms vs 1s

- **100ms (10/sec)**: High fidelity; may still saturate IPC on long runs.
- **250ms (4/sec)**: Provides responsive "thinking..." UX without saturation. Chosen per B34 mitigation.
- **1s (1/sec)**: Lowest overhead; UI feels sluggish (1-second lag on activity indicator).

---

## Section 11 — DOCTRINE amendment ratification

**Source:** brief §11.

Per `docs/build-log.md` review: no DOCTRINE amendment proposals are recorded from Ch.0 as unaddressed by Russell. The build log's Ch.0 entry does not show an outstanding amendment proposal awaiting ratification.

If Russell proposes a DOCTRINE amendment at the Ch.1 boundary, it should be recorded in `docs/build-log.md` under the Ch.1 entry and this section updated via amendment commit.

No amendment pending. Section closed.

---

## Key contract diffs from Ch.0 ADR

| Item | Ch.0 contract | Ch.1 change |
|---|---|---|
| IPC union | 21 variants (`docs/decisions/0001-ch0-foundations.md` §3) | Ch.1 adds `scheduler.window.reset` variant — Runtime adds to `ipc.ts` |
| Package `exports` | UNKNOWN / vitest-alias only | Each `@c-suite/*` package gains `exports` map + `tsconfig.build.json` + `build` script |
| SQLite handle | Not specified | Main-process-only; utility proxies via IPC |
| `process_events` table | Not in Ch.0 schema | New Ch.1 table (§4.2) |
| `cost_ledger` table | Listed in data.md but not migrated | Migrated in `001_initial.sql` |

