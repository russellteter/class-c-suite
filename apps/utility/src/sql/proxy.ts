// apps/utility/src/sql/proxy.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1.3 + §4.1
// SQL proxy: utility sends SQL params to main via MessagePort, awaits response.
// Utility never opens its own SQLite connection (main holds the single handle).

import { createLogger } from '../logger.js';

const log = createLogger();

type SqlResult = Record<string, unknown>[] | { changes: number; lastInsertRowid: number | bigint };

let _port: MessagePort | null = null;
let _reqCounter = 0;
const _pending = new Map<number, {
  resolve: (result: SqlResult) => void;
  reject: (err: Error) => void;
}>();

/**
 * Initialize the SQL proxy with the IPC port received from main.
 * Must be called once during startup before any query().
 */
export function initSqlProxy(port: MessagePort): void {
  _port = port;

  port.addEventListener('message', (event: MessageEvent) => {
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
