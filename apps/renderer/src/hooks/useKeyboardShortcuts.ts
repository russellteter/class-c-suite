// apps/renderer/src/hooks/useKeyboardShortcuts.ts
// Source: tasks/ch7-renderer-brief.md §3
// macOS keyboard shortcuts for the Home screen.
// Cmd+1..Cmd+8 → invoke playbook; Cmd+/ → focus Open Q&A; Cmd+R → home.refresh.
// Uses metaKey (macOS Cmd), NOT ctrlKey — macOS only per brief.
// playbook.invoke and home.refresh are not in the IpcMessage union yet;
// sent raw via window.ipc.send per instructions.

import { useEffect } from 'react';
import type { PlaybookId } from '../components/HomeTypes.js';

// Short names per ADR-0009 §3.2 canonical. Source: packages/shared-types/src/playbook.ts:15-23.
const ORDINAL_TO_PLAYBOOK: Record<string, PlaybookId> = {
  '1': 'cash_lever',
  '2': 'gtm_realloc',
  '3': 'strategic_option',
  '4': 'stakeholder_1_1',
  '5': 'board_narrative',
  '6': 'restructure_decision',
  '7': 'pre_mortem',
  '8': 'quick_read',
};

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.metaKey) return;

      // Cmd+1..Cmd+8 — invoke playbook
      if (e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const playbookId = ORDINAL_TO_PLAYBOOK[e.key];
        if (playbookId && typeof window !== 'undefined' && window.ipc) {
          // TODO ch7-phase-b: wire playbook.invoke in shared-types/ipc.ts, then use sendIpc().
          window.ipc.send({ kind: 'playbook.invoke', payload: { playbookId } });
        }
        return;
      }

      // Cmd+/ — focus Open Q&A bar
      if (e.key === '/') {
        e.preventDefault();
        (document.getElementById('open-qa-input') as HTMLTextAreaElement | null)?.focus();
        return;
      }

      // Cmd+R — refresh home data
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (typeof window !== 'undefined' && window.ipc) {
          // TODO ch7-phase-b: wire home.refresh in shared-types/ipc.ts, then use sendIpc().
          window.ipc.send({ kind: 'home.refresh', payload: {} });
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
