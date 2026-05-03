/**
 * Shared admin CRUD helpers for simple-row entities (locations + vendors).
 * Inline rather than abstracted because each table has its own column set.
 */

export function nullIfEmpty(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

export function intOrNull(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s || s.toUpperCase() === "TBD") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
