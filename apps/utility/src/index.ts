// apps/utility/src/index.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1.2 + §1.3
// Electron utility process entry point. Spawned via utilityProcess.fork() in main.
// Receives MessagePort from main on startup, then all subsequent IPC uses the port.

// Declare Electron utility process globals not in @types/electron for utility procs.
declare const process: NodeJS.Process & {
  parentPort: {
    once(event: 'message', handler: (e: { data: unknown; ports: MessagePort[] }) => void): void;
  };
};

import { createLogger } from './logger.js';
import { initSqlProxy } from './sql/proxy.js';
import { checkAndResumeInProgressRun } from './orchestrator/index.js';
import { initScheduler, getScheduler } from './scheduler/index.js';
import { initSafeWrite } from './safewrite/index.js';

const log = createLogger();

// IPC port received from main via __port_init handshake.
let ipcPort: MessagePort | null = null;

log.info({ message: 'utility process starting' });

// Receive the MessagePort from main (one-shot via process.parentPort).
process.parentPort.once('message', (e) => {
  const data = e.data as { kind?: string } | null;
  if (data?.kind === '__port_init' && e.ports.length > 0) {
    ipcPort = e.ports[0];
    ipcPort.start();

    // Initialize SQL proxy with the port.
    initSqlProxy(ipcPort);

    // Initialize scheduler with IPC emission capability.
    initScheduler((msg) => {
      ipcPort!.postMessage(msg);
    });

    // Initialize SafeWrite with IPC emission capability.
    // Throws VaultNotInitializedError if vault has no commits (B22 mitigation).
    // uncaughtException handler below will catch it and call process.exit(1),
    // triggering supervisor restart after vault-bootstrap.sh is run.
    initSafeWrite({ emit: (msg) => { ipcPort!.postMessage(msg); } }).catch((err: unknown) => {
      log.error({ message: 'initSafeWrite failed', err: String(err) });
      process.exit(1);
    });

    log.info({ message: 'utility IPC port initialized' });

    // Check for interrupted run and resume if found.
    checkAndResumeInProgressRun().catch((err: unknown) => {
      log.error({ message: 'checkAndResumeInProgressRun failed', err: String(err) });
    });

    // Listen for scheduler reset signal from main (5-hr window).
    ipcPort.addEventListener('message', (event: MessageEvent<{ kind?: string }>) => {
      if (event.data?.kind === 'scheduler:reset') {
        getScheduler()?.reset();
      }
    });
  }
});

// Handle uncaught exceptions — log and exit with non-zero code so main restarts us.
process.on('uncaughtException', (err: Error) => {
  log.error({ message: 'uncaughtException in utility process', err: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  log.error({ message: 'unhandledRejection in utility process', reason: String(reason) });
  process.exit(1);
});
