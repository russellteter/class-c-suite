// packages/writeback-engine/src/diff.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §3.4
// Produces a unified diff string between the current active artifact content
// and the proposed content, for WritebackDraft.diffAgainstActive.

/**
 * Produces a unified diff string (GNU diff format, no file headers).
 * Returns null if activeContent is undefined/empty (isNew artifact).
 *
 * This is a pure in-memory diff — no subprocess. Uses a minimal LCS algorithm
 * suitable for short markdown files (vault artifacts are typically <200 lines).
 */
export function computeDiff(
  activeContent: string | null,
  proposedContent: string,
): string | null {
  if (!activeContent) return null;

  const aLines = activeContent.split('\n');
  const bLines = proposedContent.split('\n');

  // Build LCS table.
  const m = aLines.length;
  const n = bLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = aLines[i - 1] === bLines[j - 1]
        ? dp[i - 1]![j - 1]! + 1
        : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }

  // Trace back to produce diff hunks.
  interface Op { op: '+' | '-' | ' '; line: string; aIdx: number; bIdx: number }
  const ops: Op[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      ops.unshift({ op: ' ', line: aLines[i - 1]!, aIdx: i, bIdx: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      ops.unshift({ op: '+', line: bLines[j - 1]!, aIdx: i, bIdx: j });
      j--;
    } else {
      ops.unshift({ op: '-', line: aLines[i - 1]!, aIdx: i, bIdx: j });
      i--;
    }
  }

  if (ops.every(o => o.op === ' ')) return null; // no changes

  // Collect contiguous changed regions with 3-line context.
  const CONTEXT = 3;
  const changed = ops.reduce<number[]>((acc, op, idx) => {
    if (op.op !== ' ') acc.push(idx);
    return acc;
  }, []);

  if (changed.length === 0) return null;

  const hunks: Array<[number, number]> = [];
  let hStart = Math.max(0, changed[0]! - CONTEXT);
  let hEnd = Math.min(ops.length - 1, changed[0]! + CONTEXT);
  for (let k = 1; k < changed.length; k++) {
    const nextStart = Math.max(0, changed[k]! - CONTEXT);
    if (nextStart <= hEnd + 1) {
      hEnd = Math.min(ops.length - 1, changed[k]! + CONTEXT);
    } else {
      hunks.push([hStart, hEnd]);
      hStart = nextStart;
      hEnd = Math.min(ops.length - 1, changed[k]! + CONTEXT);
    }
  }
  hunks.push([hStart, hEnd]);

  const diffLines: string[] = [];
  for (const [start, end] of hunks) {
    const hunkOps = ops.slice(start, end + 1);
    const aStart = hunkOps.find(o => o.op !== '+')?.aIdx ?? 1;
    const bStart = hunkOps.find(o => o.op !== '-')?.bIdx ?? 1;
    const aCount = hunkOps.filter(o => o.op !== '+').length;
    const bCount = hunkOps.filter(o => o.op !== '-').length;
    diffLines.push(`@@ -${aStart},${aCount} +${bStart},${bCount} @@`);
    for (const op of hunkOps) {
      diffLines.push(`${op.op}${op.line}`);
    }
  }

  return diffLines.join('\n');
}
