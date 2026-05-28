// apps/main/src/ipc/handlers.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1 (ipcMain handlers)
// Registers ipcMain.handle bindings for renderer-initiated read-only queries.
// Main process owns the DB handle — no direct SQLite access from renderer.

import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';
import { validateIpc } from '@c-suite/shared-types/ipc';

interface RunRow {
  run_id: string;
  playbook: string;
  question: string;
  started_at: number;
  current_state: string;
  status: string | null;
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
  const UTILITY_BOUND = new Set(['run.start', 'handoff.preview.requested']);

  // List all runs — read-only SQLite view.
  ipcMain.handle('runs:list', (_event) => {
    const rows = db.prepare(
      'SELECT run_id, playbook, question, started_at, current_state, status FROM runs ORDER BY started_at DESC LIMIT 100'
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
