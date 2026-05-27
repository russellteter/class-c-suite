// apps/utility/src/logger.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §8
// pino-based structured JSON logger for the utility process.
// Logs written to stdout (piped to main process via stdio: 'pipe').
// No native modules required.

import pino from 'pino';

export interface LogEntry {
  ts: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  process: 'utility';
  runId?: string;
  agentId?: string;
  message: string;
  [key: string]: unknown;
}

type LogContext = {
  runId?: string;
  agentId?: string;
};

const base = pino({
  level: 'info',
  timestamp: () => `,"ts":"${new Date().toISOString()}"`,
  base: null,   // no pid/hostname
  formatters: {
    level: (label) => ({ level: label }),
  },
}, pino.destination(1));   // stdout — piped to main via stdio:'pipe'

export function createLogger(context?: LogContext) {
  return base.child({
    process: 'utility' as const,
    ...(context?.runId ? { runId: context.runId } : {}),
    ...(context?.agentId ? { agentId: context.agentId } : {}),
  });
}
