/**
 * src/components/admin/DataTable.tsx — AD1.2
 *
 * Hand-rolled data table with sort, filter, pagination, bulk-select. Reusable
 * for Tasks (AD1.2), Locations / Vendors / Statutory (AD1.4), Crew (AD1.5),
 * Audit (AD1.7), Reports History (AD1.6).
 *
 * Sort/filter state is held in URL search params so refresh + share preserves
 * view. Pagination is client-side (acceptable up to ~5000 rows).
 *
 * No external dep — under 250 LOC for sort + filter + paginate + bulk.
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export interface Column<T> {
  key: string;
  label: string;
  /** Render a cell. Receives the row + value (if `accessor` is a string). */
  render?: (row: T) => React.ReactNode;
  /** If a string, used both for sort and as default text render. If a function, used for sort + default render. */
  accessor?: keyof T | ((row: T) => string | number | null);
  sortable?: boolean;
  /** Tailwind width hint, e.g. "w-32" or "w-40". */
  widthClass?: string;
  /** Right-align numeric columns. */
  numeric?: boolean;
}

export interface BulkAction {
  label: string;
  /** Called with the selected row IDs; should return promise. */
  onClick: (selectedIds: (string | number)[]) => Promise<void>;
  /** "danger" tints the button red. */
  variant?: "default" | "danger";
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  /** Each row needs a stable id for selection + react keys. */
  rowId: (row: T) => string | number;
  /** Click row → navigate / open. If absent, rows are not clickable. */
  onRowClick?: (row: T) => void;
  bulkActions?: BulkAction[];
  pageSize?: number;
  searchPlaceholder?: string;
  /** Optional client-side filter predicate; combined with search. */
  filterRow?: (row: T, query: string) => boolean;
  emptyLabel?: string;
}

function readVal<T>(col: Column<T>, row: T): string | number | null {
  if (typeof col.accessor === "function") return col.accessor(row);
  if (typeof col.accessor === "string") {
    const v = row[col.accessor as keyof T];
    return v == null ? null : (v as unknown as string | number);
  }
  return null;
}

export function DataTable<T>({
  rows,
  columns,
  rowId,
  onRowClick,
  bulkActions,
  pageSize = 50,
  searchPlaceholder = "Search…",
  filterRow,
  emptyLabel = "No rows.",
}: DataTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortKey = searchParams.get("sort") ?? null;
  const sortDir = (searchParams.get("dir") as "asc" | "desc" | null) ?? "asc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const q = searchParams.get("q") ?? "";

  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [bulkInFlight, setBulkInFlight] = useState(false);

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value == null || value === "") sp.delete(key);
    else sp.set(key, value);
    router.replace(`${pathname}?${sp.toString()}`);
  }

  // Filter
  const filtered = useMemo(() => {
    if (!q && !filterRow) return rows;
    const lower = q.toLowerCase();
    return rows.filter((r) => {
      if (filterRow && !filterRow(r, q)) return false;
      if (!q) return true;
      // default: any column value containing q
      return columns.some((c) => {
        const v = readVal(c, r);
        return v != null && String(v).toLowerCase().includes(lower);
      });
    });
  }, [rows, q, filterRow, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const cmp = (a: T, b: T) => {
      const av = readVal(col, a);
      const bv = readVal(col, b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return String(av).localeCompare(String(bv));
    };
    const out = [...filtered].sort(cmp);
    if (sortDir === "desc") out.reverse();
    return out;
  }, [filtered, sortKey, sortDir, columns]);

  // Paginate
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  // Reset selection when slice keys change drastically
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(slice.map(rowId));
      const next = new Set<string | number>();
      prev.forEach((id) => {
        if (ids.has(id)) next.add(id);
      });
      return next;
    });
  }, [slice, rowId]);

  function handleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setParam("dir", sortDir === "asc" ? "desc" : "asc");
    } else {
      setParam("sort", col.key);
      setParam("dir", "asc");
    }
  }

  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      slice.forEach((r) => {
        if (checked) next.add(rowId(r));
        else next.delete(rowId(r));
      });
      return next;
    });
  }

  function toggleOne(id: string | number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function runBulk(action: BulkAction) {
    if (selected.size === 0) return;
    setBulkInFlight(true);
    try {
      await action.onClick(Array.from(selected));
      setSelected(new Set());
    } finally {
      setBulkInFlight(false);
    }
  }

  const allVisibleChecked =
    slice.length > 0 && slice.every((r) => selected.has(rowId(r)));

  const showBulk = !!bulkActions && bulkActions.length > 0;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setParam("q", e.target.value || null)}
          placeholder={searchPlaceholder}
          className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-ehrc-blue focus:outline-none"
        />
        <div className="text-xs text-slate-500">
          {total === rows.length ? `${total} rows` : `${total} of ${rows.length} rows`}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {showBulk && (
                <th className="w-9 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleChecked}
                    onChange={(e) => toggleAllVisible(e.target.checked)}
                    aria-label="Select all on page"
                  />
                </th>
              )}
              {columns.map((c) => {
                const active = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    className={`px-3 py-2 text-left font-medium text-slate-600 ${c.widthClass ?? ""} ${
                      c.numeric ? "text-right" : ""
                    } ${c.sortable ? "cursor-pointer select-none hover:bg-slate-100" : ""}`}
                    onClick={() => handleSort(c)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sortable && (
                        <span className={`text-[10px] ${active ? "text-ehrc-navy" : "text-slate-300"}`}>
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showBulk ? 1 : 0)} className="px-4 py-12 text-center text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              slice.map((row) => {
                const id = rowId(row);
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id}
                    className={`${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""} ${
                      isSelected ? "bg-ehrc-blue/5" : ""
                    }`}
                    onClick={(e) => {
                      // ignore clicks inside the checkbox cell
                      const target = e.target as HTMLElement;
                      if (target.tagName === "INPUT" || target.closest("input")) return;
                      onRowClick?.(row);
                    }}
                  >
                    {showBulk && (
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleOne(id, e.target.checked)}
                          aria-label="Select row"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-3 py-2 align-middle ${c.numeric ? "text-right" : ""} ${c.widthClass ?? ""}`}
                      >
                        {c.render ? c.render(row) : (readVal(c, row) ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-slate-500">
            Page {safePage} of {pageCount}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setParam("page", String(safePage - 1))}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setParam("page", String(safePage + 1))}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showBulk && selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-lg">
          <div className="text-sm font-medium text-ehrc-navy">{selected.size} selected</div>
          {bulkActions!.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={bulkInFlight}
              onClick={() => runBulk(a)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                a.variant === "danger"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-ehrc-blue text-white hover:bg-ehrc-blue/90"
              } disabled:opacity-50`}
            >
              {bulkInFlight ? "…" : a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
