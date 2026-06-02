// apps/main/src/ipc/handlers.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1 (ipcMain handlers)
// Registers ipcMain.handle bindings for renderer-initiated read-only queries.
// Main process owns the DB handle — no direct SQLite access from renderer.

import { ipcMain } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { existsSync, readFileSync } from 'fs';
import type Database from 'better-sqlite3';
import { validateIpc } from '@c-suite/shared-types/ipc';

interface RunRow {
  run_id: string;
  playbook: string;
  question: string;
  started_at: number;
  finished_at: number | null;
  current_state: string;
  status: string | null;
  memo_path: string | null;
  rigor_score: number | null;
}

/** Structural type for the utility MessagePort (Electron.MessagePortMain in prod). */
type UtilityPort = { postMessage(msg: unknown): void };

/**
 * @param getUtilityPort Returns the live utility MessagePort (set asynchronously by
 *   the supervisor after fork). Renderer messages bound for the utility (run.start,
 *   handoff.preview.requested) are relayed through it. Omitted in tests.
 */
export function registerIpcHandlers(
  db: Database.Database,
  getUtilityPort?: () => UtilityPort | null,
): void {
  // Kinds the renderer emits that the utility process handles. Relayed below.
  const UTILITY_BOUND = new Set(['run.start', 'handoff.preview.requested', 'handoff.send']);

  // List all runs — read-only SQLite view. Includes memo_path + rigor_score + finished_at
  // so the Home tiles can show real freshness and the Recent Runs list can render + route a
  // completed run to the MemoViewer (memo:read below loads the body on click).
  ipcMain.handle('runs:list', (_event) => {
    const rows = db.prepare(
      'SELECT run_id, playbook, question, started_at, finished_at, current_state, status, memo_path, rigor_score FROM runs ORDER BY started_at DESC LIMIT 100'
    ).all() as RunRow[];
    return rows;
  });

  // Get a single run by runId.
  ipcMain.handle('runs:get', (_event, runId: string) => {
    const row = db.prepare(
      'SELECT * FROM runs WHERE run_id = ?'
    ).get(runId) as RunRow | undefined;
    return row ?? null;
  });

  // SQL proxy for utility process — utility sends SQL params; main executes.
  // Validated: only SELECT or INSERT/UPDATE/DELETE (no DDL) via parameter binding.
  ipcMain.handle('db:query', (_event, sql: string, params: unknown[]) => {
    // Safety: only allow parameterized queries. DDL (CREATE, DROP, ALTER) is blocked.
    const upper = sql.trim().toUpperCase();
    if (/^\s*(CREATE|DROP|ALTER|PRAGMA|ATTACH|DETACH)/i.test(upper)) {
      throw new Error('db:query blocked: DDL not permitted via IPC proxy');
    }
    const stmt = db.prepare(sql);
    // Determine query type by first keyword.
    if (upper.startsWith('SELECT')) {
      return stmt.all(...(params as Parameters<typeof stmt.all>));
    }
    return stmt.run(...(params as Parameters<typeof stmt.run>));
  });

  // ── Ch.10 runtime-ship: read-only channels the renderer invokes (ADR-0002 §1).
  // Previously unregistered → every call rejected "No handler registered" and the
  // Connectors / Scheduler / Notifications / MemoViewer surfaces silently fell back to
  // defaults. These are main-side DB reads (main owns the handle). connector.netsuite.connect
  // (OAuth side-effect, utility-owned) and the *.set writes are wired in a later increment.

  // NetSuite connection status — read the credentials vault row (no secret returned).
  ipcMain.handle('connector.netsuite.status', (_event) => {
    const row = db.prepare(
      "SELECT service_id, expires_at FROM credentials WHERE service_id = 'netsuite'"
    ).get() as { service_id: string; expires_at: number | null } | undefined;
    return { connected: Boolean(row), expiresAt: row?.expires_at ?? null };
  });

  // Vault root for memo reads. MUST match apps/utility/src/safewrite getVaultPath() — that
  // is the authoritative writer (index.ts SafeWrites every memo under it), so the same memo_path
  // must resolve identically here or memo:read 404s in production. Replicated (same path.join +
  // os.homedir() construction) rather than imported, to avoid a main→utility layering dependency.
  const vaultRoot =
    process.env.VAULT_PATH ??
    path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

  // Load a produced memo's markdown by its vault-relative path, for the MemoViewer. Read-only,
  // path-traversal-guarded (must stay inside the vault), .md-only. Returns a ready MemoViewerMemo
  // payload (runId/status/rigor from the owning run row), or null if the path is unsafe/missing —
  // the renderer treats null as "do not navigate". This is what makes a produced memo visible.
  ipcMain.handle('memo:read', (_event, arg: { path?: string } | string) => {
    const memoPath = typeof arg === 'string' ? arg : arg?.path;
    if (!memoPath || typeof memoPath !== 'string') return null;
    const abs = path.resolve(vaultRoot, memoPath);
    const rootWithSep = path.resolve(vaultRoot) + path.sep;
    if (!abs.startsWith(rootWithSep) || !abs.toLowerCase().endsWith('.md')) return null;
    if (!existsSync(abs)) return null;
    let memoMarkdown: string;
    try {
      memoMarkdown = readFileSync(abs, 'utf8');
    } catch {
      return null;
    }
    // Owning run row (memo_path is stored vault-relative) → runId + rigor.
    const run = db.prepare(
      'SELECT run_id, status, rigor_score FROM runs WHERE memo_path = ?'
    ).get(memoPath) as { run_id: string; status: string | null; rigor_score: number | null } | undefined;
    const filename = memoPath.split('/').pop() ?? memoPath;
    // Clean vs draft derives from the .draft.md filename suffix (more reliable than the status string).
    const status: 'clean' | 'draft' = filename.toLowerCase().endsWith('.draft.md') ? 'draft' : 'clean';
    const h1 = memoMarkdown.split('\n').find((l) => l.startsWith('# '));
    const memoTitle = h1 ? h1.slice(2).trim() : filename;
    return {
      runId: run?.run_id ?? '',
      memoMarkdown,
      status,
      // A clean (non-draft) shipped memo represents an accepted decision → enables the "Draw up for
      // Cowork" CTA (MemoViewer gate at :197). Matches the fixture semantic (hasAcceptedDecision ⟺ clean).
      hasAcceptedDecision: status === 'clean',
      rigorScore: run?.rigor_score ?? null,
      memoPath,
      filename,
      memoTitle,
    };
  });

  // Tool-call detail for the MemoViewer side panel.
  // ADR-0006 §5.2 + tests/unit/click-claim-tool-call.spec.ts: citations resolve by SOURCE_ID, not
  // call_id — the [^vault-N] / [^sf-pipeline-…] footnote carries the source_id. Run-scoped because a
  // source_id is only unique WITHIN a run (the strategic path reuses vault-1..vault-8 every run of the
  // same question); resolving unscoped would surface an older run's excerpt in a newer memo, breaking
  // C2's promise that the provenance click resolves to THIS memo's note. Back-compat: a bare string or
  // legacy {call_id} still resolves (unscoped, by source_id).
  ipcMain.handle('tool-call:get', (_event, arg: { run_id?: string; source_id?: string; call_id?: string } | string) => {
    const runId = typeof arg === 'object' && arg ? arg.run_id : undefined;
    const sourceId = typeof arg === 'string' ? arg : (arg?.source_id ?? arg?.call_id);
    if (!sourceId) return null;
    if (runId) {
      return db.prepare('SELECT * FROM tool_calls WHERE run_id = ? AND source_id = ?').get(runId, sourceId) ?? null;
    }
    return db.prepare('SELECT * FROM tool_calls WHERE source_id = ?').get(sourceId) ?? null;
  });

  // Scheduler run history for a job — last N runs from scheduled_jobs.
  ipcMain.handle('scheduler.history.get', (_event, arg: { jobId?: string; limit?: number }) => {
    const jobId = arg?.jobId;
    if (!jobId) return [];
    const limit = Math.min(Math.max(arg?.limit ?? 10, 1), 50);
    const rows = db.prepare(
      `SELECT actually_ran_at, scheduled_for, status, duration_ms
       FROM scheduled_jobs WHERE job_id = ? ORDER BY scheduled_for DESC LIMIT ?`
    ).all(jobId, limit) as Array<{
      actually_ran_at: number | null; scheduled_for: number; status: string; duration_ms: number | null;
    }>;
    return rows.map((r) => ({
      runAt: new Date(r.actually_ran_at ?? r.scheduled_for).toISOString(),
      status: r.status,
      durationMs: r.duration_ms ?? undefined,
    }));
  });

  // Settings reads — no settings table yet (Ch.10 follow-up). Return empty so the screens
  // render their built-in defaults instead of rejecting. The *.set writes + a backing
  // app_settings table are the next increment.
  ipcMain.handle('scheduler.settings.get', (_event) => ({}));
  ipcMain.handle('notification.settings.get', (_event) => ({}));

  // Internal log relay from renderer — outside typed union (ADR §8.3).
  ipcMain.on('ipc:message', (_event, raw) => {
    if (raw && typeof raw === 'object' && (raw as { kind?: string }).kind === '__internal.log') {
      // Renderer log relay — write to logger (logger.ts wires this in main.ts).
      // Emit to process.stdout for now; main.ts replaces with pino write.
      const payload = (raw as { payload: Record<string, unknown> }).payload;
      process.stdout.write(
        JSON.stringify({ ...payload, process: 'renderer' }) + '\n'
      );
    } else if (raw) {
      // Validate all other incoming messages.
      let valid = false;
      try {
        validateIpc(raw);
        valid = true;
      } catch {
        process.stderr.write(
          JSON.stringify({ level: 'warn', message: 'invalid IPC message dropped', raw: String(raw) }) + '\n'
        );
      }
      // Relay utility-bound kinds to the utility process (run.start → orchestrator).
      if (valid && UTILITY_BOUND.has((raw as { kind: string }).kind)) {
        const port = getUtilityPort?.();
        if (port) {
          port.postMessage(raw);
        } else {
          process.stderr.write(
            JSON.stringify({ level: 'warn', message: 'utility port not ready — dropping', kind: (raw as { kind: string }).kind }) + '\n'
          );
        }
      }
    }
  });
}
