// apps/main/src/log.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §8
// Testable logger facade with injectable sink.
// Tests import this module directly (no Electron/pino deps required).
// Main process uses logger.ts (pino + file rotation); this facade is
// the unit-testable surface per logging.spec.ts §9 row 5.

export type LogProcess = 'main' | 'utility' | 'renderer';

export interface LogEntry {
  ts: string;                        // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  process: LogProcess;
  runId?: string;
  agentId?: string;
  message: string;
  [key: string]: unknown;
}

type LogFields = Omit<LogEntry, 'ts' | 'level' | 'process'> & { message: string };

export interface Logger {
  debug: (fields: LogFields) => void;
  info: (fields: LogFields) => void;
  warn: (fields: LogFields) => void;
  error: (fields: LogFields) => void;
}

/**
 * Create a structured logger for the given process.
 *
 * @param processTag  'main' | 'utility' | 'renderer' — tagged on every entry.
 * @param sink        Optional injectable sink (default: process.stdout JSON Lines).
 *                    Pass a callback to capture entries in tests.
 *
 * Correlation discipline (ADR §8.4):
 *   - Run-related events MUST include runId in the fields object.
 *   - Agent events MUST include runId AND agentId.
 *   - System events (app start, tray) omit both — pass only { message: '...' }.
 */
export function createLogger(
  processTag: LogProcess,
  sink?: (entry: LogEntry) => void,
): Logger {
  const defaultSink = (entry: LogEntry): void => {
    process.stdout.write(JSON.stringify(entry) + '\n');
  };
  const write = sink ?? defaultSink;

  function emit(level: LogEntry['level'], fields: LogFields): void {
    const { message, runId, agentId, ...rest } = fields;
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      process: processTag,
      message,
      ...(typeof runId === 'string' ? { runId } : {}),
      ...(typeof agentId === 'string' ? { agentId } : {}),
      ...rest,
    };
    write(entry);
  }

  return {
    debug: (fields) => emit('debug', fields),
    info: (fields) => emit('info', fields),
    warn: (fields) => emit('warn', fields),
    error: (fields) => emit('error', fields),
  };
}
