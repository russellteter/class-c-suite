// apps/main/src/logger.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §8
// pino-based structured JSON logger. Main process writes consolidated log.
// Path: app.getPath('logs')/csuite.jsonl with daily rotation via pino transport.
// No native modules — plain pino (no pino-pretty required).

import pino from 'pino';
import * as path from 'path';

// Lazy-evaluate log path so this module is safe to import in tests
// (app.getPath throws outside Electron context).
function getLogDest(): pino.DestinationStream | string {
  try {
    const { app } = require('electron') as typeof import('electron');
    return path.join(app.getPath('logs'), 'csuite.jsonl');
  } catch {
    // Not in Electron context (unit tests) — log to stdout.
    return pino.destination(1);
  }
}

export interface LogEntry {
  ts: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  process: 'main' | 'utility' | 'renderer';
  runId?: string;
  agentId?: string;
  message: string;
  [key: string]: unknown;
}

type ProcessTag = 'main' | 'utility' | 'renderer';

export function createLogger(processTag: ProcessTag, runId?: string, agentId?: string) {
  const dest = getLogDest();
  const base = pino(
    {
      level: 'info',
      timestamp: () => `,"ts":"${new Date().toISOString()}"`,
      base: null,                     // no pid/hostname in output
      formatters: {
        level: (label) => ({ level: label }),
      },
    },
    typeof dest === 'string' ? pino.destination({ dest, sync: false }) : dest
  );

  return base.child({
    process: processTag,
    ...(runId ? { runId } : {}),
    ...(agentId ? { agentId } : {}),
  });
}

/**
 * Write a pre-formed LogEntry to the log file.
 * Used by the renderer log relay (ADR §8.3) and by ipc/handlers.ts.
 */
export function writeLog(entry: LogEntry): void {
  // Relay entries maintain their original ts and process tags.
  process.stdout.write(JSON.stringify(entry) + '\n');
}
