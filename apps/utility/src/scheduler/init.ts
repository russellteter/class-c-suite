// apps/utility/src/scheduler/init.ts
// Singleton init + accessor for the Scheduler instance.

import { Scheduler } from './scheduler.js';
import type { IpcMessage } from '@c-suite/shared-types/ipc';

let _scheduler: Scheduler | null = null;

export function initScheduler(emitIpc: (msg: IpcMessage) => void, windowCap = 180_000): Scheduler {
  _scheduler = new Scheduler(windowCap, emitIpc);
  return _scheduler;
}

export function getScheduler(): Scheduler | null {
  return _scheduler;
}
