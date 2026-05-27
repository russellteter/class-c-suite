// apps/utility/src/sql/proxy.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1.3 + §4.1
// SQL proxy: utility sends SQL params to main via MessagePort, awaits response.
// Utility never opens its own SQLite connection (main holds the single handle).
//
// NOTE (B45 fix): In Electron utility processes, e.ports[0] from parentPort.once('message')
// is a MessagePortMain (extends NodeEventEmitter) — it uses .on() not addEventListener.
// This proxy uses the shared IpcPort interface that covers both Web MessagePort and
// Electron's MessagePortMain (which uses .on/.postMessage).

import { createLogger } from '../logger.js';

const log = createLogger();

type SqlResult = Record<string, unknown>[] | { changes: number; lastInsertRowid: number | bigint };

/**
 * Structural interface satisfied by both Web API MessagePort and Electron MessagePortMain.
 * Electron utility process ports come in as MessagePortMain (NodeEventEmitter-based).
 */
export interface IpcPort {
  on(event: 'message', listener: (event: { data: unknown }) => void): unknown;
  postMessage(message: unknown): void;
  start?(): void;
}

let _port: IpcPort | null = null;
let _reqCounter = 0;
const _pending = new Map<number, {
  resolve: (result: SqlResult) => void;
  reject: (err: Error) => void;
}>();

/**
 * Initialize the SQL proxy with the IPC port received from main.
 * Must be called once during startup before any query().
 */
export function initSqlProxy(port: IpcPort): void {
  _port = port;

  // Use .on() — MessagePortMain (Electron utility process) is a NodeEventEmitter.
  // Web API MessagePort also supports .on() after .start() via its EventTarget interface
  // polyfilled in Electron's Node environment.
  port.on('message', (event: { data: unknown }) => {
    const { _reqId, result, error } = event.data as {
      _reqId?: number;
      result?: SqlResult;
      error?: string;
    };
    if (_reqId === undefined) return;
    const pending = _pending.get(_reqId);
    if (!pending) return;
    _pending.delete(_reqId);
    if (error !== undefined) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result!);
    }
  });
}

/**
 * Execute a parameterized SQL query via IPC to main.
 * @param sql    Parameterized SQL string (no DDL allowed).
 * @param params Bound parameter values.
 */
export function query(sql: string, params: unknown[] = []): Promise<SqlResult> {
  if (!_port) {
    return Promise.reject(new Error('SqlProxy: not initialized — call initSqlProxy() first'));
  }

  return new Promise<SqlResult>((resolve, reject) => {
    const reqId = ++_reqCounter;
    _pending.set(reqId, { resolve, reject });

    try {
      _port!.postMessage({ kind: 'db:query', _reqId: reqId, sql, params });
    } catch (err) {
      _pending.delete(reqId);
      log.error({ message: 'SqlProxy: postMessage failed', err: String(err) });
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
