// apps/renderer/src/ipc/handoff.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §5.3
// Local IPC helpers for handoff variants. Bypasses sendIpc() validation because
// the handoff IPC kinds (handoff.preview.ready, handoff.send, etc.) are not yet
// in shared-types/ipc.ts — Runtime sub-agent ships those in parallel.
// TODO ch9-runtime-ship: once Runtime lands handoff variants in shared-types/ipc.ts,
// migrate these callers to sendIpc() and delete this file.

// ── Local HandoffBrief type (mirrors ADR §3.1/§3.2) ─────────────────────────
// TODO ch9-runtime-ship: replace with import from '@c-suite/shared-types/handoff'

export type CoworkSkillId =
  | 'class-brand-document'
  | 'class-brand-excel'
  | 'class-brand-presentations'
  | 'class-ppt-cyan-light'
  | 'class-brand-voice';

export type HandoffOriginType = 'decision' | 'memo' | 'position' | 'pre_mortem';

export interface HandoffFrontmatter {
  type: 'handoff';
  id: string;                       // HANDOFF-<YYYY-MM-DD>-<slug>
  origin_type: HandoffOriginType;
  origin_path: string;              // vault-relative path to originating artifact
  origin_title: string;
  created: string;                  // YYYY-MM-DD
  created_by_run_id: string;
  status: 'drafted' | 'sent' | 'executed';
  cowork_brand_skills: CoworkSkillId[];
  executed_by: string[] | null;
  filename: string;                 // e.g. 2026-05-27-q3-turnaround.md
}

export interface HandoffBrief {
  runId: string;
  frontmatter: HandoffFrontmatter;
  bodyMarkdown: string;             // §3.2 sections — may be edited before send
}

// ── IPC send helpers ─────────────────────────────────────────────────────────

/** Subscribe to handoff.preview.ready events from main process. */
export function onHandoffPreviewReady(
  listener: (payload: { runId: string; brief: HandoffBrief }) => void,
): () => void {
  if (typeof window === 'undefined' || !window.ipc) return () => {};
  return window.ipc.on('ipc:message', (raw: unknown) => {
    const msg = raw as { kind?: string; payload?: unknown };
    if (msg?.kind === 'handoff.preview.ready') {
      listener(msg.payload as { runId: string; brief: HandoffBrief });
    }
  });
}

/** Send handoff.send to main — triggers SafeWrite + vault commit. */
export function sendHandoffSend(payload: {
  runId: string;
  brief: HandoffBrief;
  editedBodyMarkdown?: string;
}): void {
  if (typeof window === 'undefined' || !window.ipc) return;
  // TODO ch9-runtime-ship: route through sendIpc once variant lands in shared-types
  window.ipc.send({ kind: 'handoff.send', payload });
}

/** Send handoff.cancelled to main. */
export function sendHandoffCancelled(runId: string): void {
  if (typeof window === 'undefined' || !window.ipc) return;
  window.ipc.send({ kind: 'handoff.cancelled', payload: { runId } });
}

/** Subscribe to handoff.sent confirmation from main. */
export function onHandoffSent(
  listener: (payload: { runId: string; handoffId: string; path: string }) => void,
): () => void {
  if (typeof window === 'undefined' || !window.ipc) return () => {};
  return window.ipc.on('ipc:message', (raw: unknown) => {
    const msg = raw as { kind?: string; payload?: unknown };
    if (msg?.kind === 'handoff.sent') {
      listener(msg.payload as { runId: string; handoffId: string; path: string });
    }
  });
}

/** Subscribe to handoff.failed error events from main. */
export function onHandoffFailed(
  listener: (payload: { runId: string; reason: string }) => void,
): () => void {
  if (typeof window === 'undefined' || !window.ipc) return () => {};
  return window.ipc.on('ipc:message', (raw: unknown) => {
    const msg = raw as { kind?: string; payload?: unknown };
    if (msg?.kind === 'handoff.failed') {
      listener(msg.payload as { runId: string; reason: string });
    }
  });
}

/** Send handoff.preview.requested — triggers Runtime to generate the brief. */
export function sendHandoffPreviewRequested(payload: {
  runId: string;
  originType: HandoffOriginType;
  originPath: string;
  originTitle: string;
}): void {
  if (typeof window === 'undefined' || !window.ipc) return;
  window.ipc.send({ kind: 'handoff.preview.requested', payload });
}
