// apps/utility/src/index.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1.2 + §1.3
// Electron utility process entry point. Spawned via utilityProcess.fork() in main.
// Receives MessagePort from main on startup, then all subsequent IPC uses the port.

// Declare Electron utility process globals not in @types/electron for utility procs.
// NOTE (B45 fix): In Electron utility processes, e.ports[] contains MessagePortMain objects
// (NodeEventEmitter-based, .on() API). Typed as IpcPort here to match the proxy interface.
declare const process: NodeJS.Process & {
  parentPort: {
    once(event: 'message', handler: (e: { data: unknown; ports: IpcPort[] }) => void): void;
  };
};

import { createLogger } from './logger.js';
import { initSqlProxy, type IpcPort } from './sql/proxy.js';
import { checkAndResumeInProgressRun } from './orchestrator/index.js';
import { handleHandoffPreviewRequested } from './orchestrator/run-loop.js';
import { initScheduler, getScheduler } from './scheduler/index.js';
import { initSafeWrite } from './safewrite/index.js';
import type { HandoffGeneratorInput } from '@c-suite/shared-types/handoff';

// B45 diagnostic: emit runtime identity on startup so supervisor can log ABI + Node version.
// This runs before any async work; if a later import crashes we get the env first.
if (process.env.UTILITY_DIAG === '1') {
  const diagLine = JSON.stringify({
    nodeVersion: process.version,
    modulesAbi: String(process.versions.modules),
    electronVersion: process.versions.electron ?? 'none',
    execPath: process.execPath,
  });
  process.stderr.write('UTILITY_DIAG:' + diagLine + '\n');
}

const log = createLogger();

// IPC port received from main via __port_init handshake.
// Typed as IpcPort (structural) — Electron utility process receives MessagePortMain (NodeEventEmitter).
let ipcPort: IpcPort | null = null;

log.info({ message: 'utility process starting' });

// Receive the MessagePort from main (one-shot via process.parentPort).
process.parentPort.once('message', (e) => {
  const data = e.data as { kind?: string } | null;
  if (data?.kind === '__port_init' && e.ports.length > 0) {
    ipcPort = e.ports[0];
    ipcPort.start?.();   // MessagePortMain needs .start() to begin receiving; optional on IpcPort

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

    // Listen for IPC messages from main.
    // Use .on() — MessagePortMain (Electron utility process) is NodeEventEmitter, not EventTarget.
    ipcPort.on('message', (event: { data: unknown }) => {
      const msg = event.data as { kind?: string; payload?: unknown } | null;

      if (msg?.kind === 'scheduler:reset') {
        getScheduler()?.reset();
        return;
      }

      // Ch.9 — explicit "Draw up for Cowork" trigger.
      // ONLY fires when renderer sends handoff.preview.requested; never auto.
      // Source: docs/decisions/0011-ch9-cowork-handoff.md §5.1 + §7.
      if (msg?.kind === 'handoff.preview.requested') {
        const payload = msg.payload as { runId: string; originType: string; originId: string } | undefined;
        if (!payload?.runId || !payload.originType || !payload.originId) {
          log.error({ message: 'handoff.preview.requested: missing payload fields', payload });
          return;
        }
        // Build a minimal HandoffGeneratorInput from the IPC payload.
        // The renderer provides only the trigger fields; runner.ts enriches from vault.
        // playbookId defaults to 'open_qa' (sentinel — caller didn't supply one).
        const input: HandoffGeneratorInput = {
          origin: {
            type: payload.originType as HandoffGeneratorInput['origin']['type'],
            id: payload.originId,
            path: `${payload.originType}s/${payload.originId}.md`,
            title: payload.originId,
            bodyMarkdown: '',
            frontmatter: {},
          },
          runContext: {
            runId: payload.runId,
            playbookId: 'open_qa',
            stakeholdersOfInterest: [],
            workstreamsOfInterest: [],
            // memoMarkdown intentionally omitted — not available from IPC trigger
          },
        };
        handleHandoffPreviewRequested(payload.runId, input, (m) => ipcPort!.postMessage(m)).catch(
          (err: unknown) => log.error({ message: 'handleHandoffPreviewRequested failed', err: String(err) }),
        );
        return;
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
