/**
 * Recursively replace `-` with `_` on object keys.
 * Source: docs/research/R0-constraints-ledger.md §SD-02 (lines 329-346).
 * Used BEFORE Zod.parse() on every vault YAML read.
 */
export function normalizeKeys<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  // YAML 1.1 parsers (js-yaml default) auto-convert ISO date strings to Date objects.
  // The vault stores dates as strings; coerce back so z.string() schemas accept them.
  if (obj instanceof Date) {
    return obj.toISOString().slice(0, 10) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeys) as unknown as T;
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k.replace(/-/g, '_'),
        normalizeKeys(v),
      ]),
    ) as T;
  }
  return obj;
}

/** Key normalizer as a function reference (for single-key transforms). */
export const Stringly = (k: string): string => k.replace(/-/g, '_');
