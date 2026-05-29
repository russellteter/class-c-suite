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

import { join } from 'node:path';
import { createLogger } from './logger.js';
import { initSqlProxy, type IpcPort } from './sql/proxy.js';
import { checkAndResumeInProgressRun } from './orchestrator/index.js';
import { handleHandoffPreviewRequested, startRun } from './orchestrator/run-loop.js';
import type { IpcEmit } from './orchestrator/hooks.js';
import { initSharedDb, getSharedDb } from './db/sharedDb.js';
import { initScheduler, getScheduler } from './scheduler/index.js';
import { initSafeWrite, safeWrite, getVaultPath } from './safewrite/index.js';
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

    // B47 keystone: open shared runtime.db so runs persist to main's DB file.
    // C_SUITE_DB_PATH is injected by supervisor.ts forkUtility().
    // initSharedDb logs and throws if the env var is absent — the uncaughtException
    // handler below will catch it and call process.exit(1), triggering supervisor restart.
    initSharedDb();

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
    ipcPort.on('message', (event: { data: unknown }) => { void (async () => {
      const msg = event.data as { kind?: string; payload?: unknown } | null;

      if (msg?.kind === 'scheduler:reset') {
        getScheduler()?.reset();
        return;
      }

      // run.start — drive a playbook through the orchestrator and SafeWrite its memo.
      // B47 keystone: uses the shared runtime.db connection (initSharedDb above) so
      // the runs row and agent_invocations rows persist to main's file-backed DB.
      // Crash-resume and home runs-list now work because rows survive process restart.
      if (msg?.kind === 'run.start') {
        const payload = msg.payload as { runId?: string; playbook?: string; question?: string } | undefined;
        if (!payload?.runId || !payload.playbook || !payload.question) {
          log.error({ message: 'run.start: missing payload fields', payload });
          return;
        }
        const { runId, playbook, question } = payload;
        const emit: IpcEmit = (m) => ipcPort!.postMessage(m);
        try {
          // getSharedDb() returns the single shared connection opened at initSharedDb().
          // Do NOT close it here — closing after run #1 would kill every subsequent run.
          const sharedDb = getSharedDb();
          const result = await startRun(runId, playbook, question, sharedDb, emit);
          // Mark the run finished so checkAndResumeInProgressRun (which queries
          // status='in_progress') does not re-trigger a completed run on next startup.
          const runStatus = result.finalState.kind === 'failed' ? 'failed'
            : result.finalState.kind === 'shipped-draft' ? 'shipped_draft' : 'shipped_clean';
          sharedDb.prepare(`UPDATE runs SET status = ?, finished_at = unixepoch() WHERE run_id = ?`).run(runStatus, runId);
          if (result.memoMarkdown && result.memoPath) {
            const absPath = join(getVaultPath(), result.memoPath);
            const writeResult = await safeWrite({
              absPath,
              content: result.memoMarkdown,
              agent: 'Synthesizer',
              playbook,
              runId,
            });
            log.info({
              runId,
              message: 'run.start: memo SafeWrite',
              memoPath: result.memoPath,
              ok: 'ok' in writeResult ? writeResult.ok : false,
            });
          } else {
            log.warn({ runId, message: 'run.start: no memo produced (no memoMarkdown/memoPath)' });
          }
          log.info({ runId, message: `run.start complete — final state ${result.finalState.kind}` });
        } catch (err) {
          log.error({ runId, message: 'run.start failed', err: String(err) });
          try {
            getSharedDb().prepare(`UPDATE runs SET status = 'failed', finished_at = unixepoch() WHERE run_id = ?`).run(runId);
          } catch { /* shared DB may be unavailable; the run.failed IPC still fires below */ }
          ipcPort!.postMessage({ kind: 'run.failed', payload: { runId, reason: String(err), stage: 'run-loop' } });
        }
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
        // Build HandoffGeneratorInput from IPC payload + vault enrichment.
        // Vault directory convention is kebab-case (pre-mortems/, not pre_mortems/).
        // Source: packages/shared-types/src/parseArtifact.ts:80 + data.md §Shared zone.
        const originDirMap: Record<string, string> = {
          decision: 'decisions',
          memo: 'memos',
          position: 'positions',
          pre_mortem: 'pre-mortems',
        };
        const originDir = originDirMap[payload.originType] ?? `${payload.originType}s`;
        const originPath = `${originDir}/${payload.originId}.md`;

        // Enrich from vault: read the originating artifact's body + frontmatter.
        // Best-effort — if the file isn't readable, runner.ts gets empty strings
        // and the brief generation degrades rather than failing.
        let bodyMarkdown = '';
        let frontmatter: Record<string, unknown> = {};
        let title = payload.originId;
        try {
          const vaultPath = process.env.VAULT_PATH ?? `${process.env.HOME}/Documents/Claude/Projects/Business Planning`;
          const fsMod = await import('node:fs/promises');
          const pathMod = await import('node:path');
          const yamlMod = await import('js-yaml');
          const fullPath = pathMod.join(vaultPath, originPath);
          const raw = await fsMod.readFile(fullPath, 'utf8');
          const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
          if (match) {
            const parsed = yamlMod.load(match[1]);
            if (parsed && typeof parsed === 'object') frontmatter = parsed as Record<string, unknown>;
            bodyMarkdown = match[2] ?? '';
          } else {
            bodyMarkdown = raw;
          }
          const fmTitle = frontmatter['title'];
          if (typeof fmTitle === 'string' && fmTitle.trim()) title = fmTitle.trim();
        } catch (err) {
          log.warn({ message: 'handoff vault enrichment failed; proceeding with empty origin body', originPath, err: String(err) });
        }

        const input: HandoffGeneratorInput = {
          origin: {
            type: payload.originType as HandoffGeneratorInput['origin']['type'],
            id: payload.originId,
            path: originPath,
            title,
            bodyMarkdown,
            frontmatter,
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
    })().catch((err: unknown) => log.error({ message: 'ipcPort message handler crashed', err: String(err) })); });
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
