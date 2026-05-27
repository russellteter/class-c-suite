// apps/utility/src/scheduler/index.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §5
// Token-budget concurrency scheduler singleton in utility process.
// Full implementation in commit #7 (ADR §5). This file is the module entry.

export { Scheduler } from './scheduler.js';
export { initScheduler, getScheduler } from './init.js';
