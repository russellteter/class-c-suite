// apps/renderer/src/screens/Home.fixtures.ts
// Source: tasks/ch7-renderer-brief.md §5
// Sample data for dev mode and RTL specs (Test sub-agent scope).
// NOT imported by production code paths.

import type { WorkstreamSummary, DecisionSummary, ScheduledJobStatus } from '../components/HomeTypes.js';

export const FIXTURE_WORKSTREAMS: WorkstreamSummary[] = [
  { id: 'WS-01', status: 'GREEN', phase: 'execution' },
  { id: 'WS-02', status: 'GREEN', phase: 'execution' },
  { id: 'WS-03', status: 'YELLOW', phase: 'execution' },
  { id: 'WS-04', status: 'GREEN', phase: 'execution' },
  { id: 'WS-05', status: 'RED',   phase: 'execution' },
  { id: 'WS-06', status: 'GREEN', phase: 'maintenance' },
  { id: 'WS-07', status: 'YELLOW', phase: 'maintenance' },
  { id: 'WS-08', status: 'GREEN', phase: 'maintenance' },
];

export const FIXTURE_DECISIONS: DecisionSummary[] = [
  { id: 'DEC-005', title: 'Strategic-option recap path' },
  { id: 'DEC-006', title: 'Barclays renewal — line of credit' },
  { id: 'DEC-008', title: 'GTM head-count reduction trigger' },
  { id: 'DEC-009', title: 'AWS deferral conversion path' },
  { id: 'DEC-011', title: 'Board deck framing — turnaround vs growth' },
];

export const FIXTURE_JOBS: ScheduledJobStatus[] = [
  { id: 'monday-tripwire',    name: 'Daily cash snapshot',         pendingNote: 'Pending Ch.10' },
  { id: 'monday-stakeholder', name: 'Weekly GTM health digest',    pendingNote: 'Pending Ch.10' },
  { id: 'sunday-renewal',     name: 'Barclays AR aging monitor',   pendingNote: 'Pending Ch.10' },
  { id: 'sunday-dashboard',   name: 'Board prep reminder (W38)',   pendingNote: 'Pending Ch.10' },
  { id: 'daily-morning-brief',name: 'Workstream stale check',      pendingNote: 'Pending Ch.10' },
];

export const FIXTURE_WRITEBACK_COUNT = 3;

export const FIXTURE_COST_USAGE = {
  windowPct: 68,
  todayUsd: 4.20,
  weekUsd: 19.80,
};
