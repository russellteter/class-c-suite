// apps/main/src/supervisor.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §3
// Owns the utility process lifecycle: spawn, crash detection, supervised restart.

import { utilityProcess, MessageChannelMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { createLogger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = createLogger('main');

const MAX_RESTARTS = 5;
const RESTART_WINDOW_MS = 60_000;   // 5 restarts within 60s triggers halt
const RESTART_DELAY_MS = 500;       // wait 500ms before respawning

// Resolved at runtime — compiled utility entry.
// __dirname = apps/main/dist → utility dist entry at apps/utility/dist/index.js
const UTILITY_PATH = path.join(__dirname, '..', '..', 'utility', 'dist', 'index.js');

/** Structural IPC-sender subset used by supervisor to emit run.failed to renderer. */
export interface IpcSender {
  send: (channel: string, data: unknown) => void;
}

export interface SupervisionState {
  restarts: number[];   // timestamps of recent crashes (ms epoch)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proc: any | null;    // Electron.UtilityProcess in production; EventEmitter mock in tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  port: any | null;    // Electron.MessagePortMain in production; null in tests
}

function logCrashToSQLite(
  db: Database.Database,
  eventType: 'crash' | 'restart' | 'halt' | 'start',
  detail: { exitCode?: number; stack?: string; restartCount?: number }
): void {
  try {
    db.prepare(`
      INSERT INTO process_events (event_id, occurred_at, process, event_type, exit_code, stack_trace, restart_count)
      VALUES (?, ?, 'utility', ?, ?, ?, ?)
    `).run(
      randomUUID(),
      Date.now(),
      eventType,
      detail.exitCode ?? null,
      detail.stack ?? null,
      detail.restartCount ?? null
    );
  } catch (err) {
    log.error({ message: 'failed to write process_event to SQLite', err: String(err) });
  }
}

export function forkUtility(): Electron.UtilityProcess {
  const proc = utilityProcess.fork(UTILITY_PATH, [], {
    serviceName: 'c-suite-orchestrator',
    env: {
      ...process.env,
      UTILITY_ROLE: 'orchestrator',
    },
    stdio: 'pipe',    // utility's stderr goes to main for crash logging
  });
  return proc;
}

export function setupUtilityChannel(proc: Electron.UtilityProcess): Electron.MessagePortMain {
  const { port1, port2 } = new MessageChannelMain();

  // Transfer port2 to the utility process.
  proc.postMessage({ kind: '__port_init' }, [port2]);

  port1.start();
  return port1;
}

export function startSupervision(
  state: SupervisionState,
  db: Database.Database,
  webContents: IpcSender,
): void {
  const proc = forkUtility();
  state.proc = proc;

  const port = setupUtilityChannel(proc);
  state.port = port;

  logCrashToSQLite(db, 'start', {});
  log.info({ message: 'utility process started' });

  // Capture utility stderr for crash logging.
  proc.stderr?.on('data', (chunk: Buffer) => {
    const stack = chunk.toString();
    logCrashToSQLite(db, 'crash', { stack });
    log.error({ message: 'utility stderr', stack });
  });

  proc.on('exit', (code) => {
    state.proc = null;
    state.port = null;

    if (code === 0) {
      log.info({ message: 'utility process exited cleanly' });
      return;    // clean shutdown — do not restart
    }

    const now = Date.now();
    state.restarts = state.restarts
      .filter(t => now - t < RESTART_WINDOW_MS)
      .concat(now);

    logCrashToSQLite(db, 'crash', { exitCode: code ?? undefined, restartCount: state.restarts.length });
    log.error({ message: 'utility process crashed', exitCode: code, restartCount: state.restarts.length });

    if (state.restarts.length > MAX_RESTARTS) {
      // Surface to renderer and halt.
      logCrashToSQLite(db, 'halt', { exitCode: code ?? undefined, restartCount: state.restarts.length });
      log.error({ message: 'utility halt — too many restarts', count: state.restarts.length });
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
