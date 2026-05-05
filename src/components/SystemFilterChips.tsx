/**
 * src/components/SystemFilterChips.tsx — worker app · system filter for Today list.
 *
 * Sticky horizontally-scrollable chip row. Single-select per V's lock:
 *  - Tap a system chip → list filters to that system, persisted via localStorage.
 *  - Tap the active chip again, or tap "All", to clear.
 *
 * Counts on each chip reflect the FULL Today list (overdue + pending + claimed),
 * not the filtered view, so the worker can see how many fire-safety tasks exist
 * regardless of which chip is currently active.
 *
 * Done tasks are not counted (they're in the collapsed accordion below the list)
 * so the chip counts match what the worker sees they still need to do.
 *
 * Persistence: localStorage key `fms_worker_system_filter`. Empty string = All.
 */

"use client";

// useEffect not currently used; readPersistedFilter is called from TodayPage
import { systemMeta } from "@/lib/system-colors";

const STORAGE_KEY = "fms_worker_system_filter";

interface SystemCount {
  system: string;
  count: number;
}

interface Props {
  systemCounts: SystemCount[]; // unfiltered counts, per system
  totalActive: number; // sum across all systems
  active: string | null;
  onChange: (next: string | null) => void;
}

export function SystemFilterChips({ systemCounts, totalActive, active, onChange }: Props) {
  // No chip row when there's nothing to filter
  if (totalActive === 0) return null;

  function pick(sys: string | null) {
    onChange(sys);
    try {
      if (sys == null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, sys);
    } catch {
      // localStorage may be unavailable (private mode etc.) — silent fail
    }
  }

  return (
    <div
      className="sticky top-14 z-30 flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2.5"
      role="tablist"
      aria-label="Filter tasks by system"
      style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
    >
      <Chip
        label="All"
        count={totalActive}
        active={active == null}
        bgWhenActive="#0055FF"
        textWhenActive="#fff"
        onClick={() => pick(null)}
      />
      {systemCounts.map((sc) => {
        const meta = systemMeta(sc.system);
        const isActive = active === sc.system;
        return (
          <Chip
            key={sc.system}
            label={meta.short}
            count={sc.count}
            active={isActive}
            bgWhenActive={meta.hex}
            textWhenActive="#fff"
            onClick={() => pick(isActive ? null : sc.system)}
            showClearMark={isActive}
          />
        );
      })}
    </div>
  );
}

interface ChipProps {
  label: string;
  count: number;
  active: boolean;
  bgWhenActive: string;
  textWhenActive: string;
  onClick: () => void;
  showClearMark?: boolean;
}

function Chip({ label, count, active, bgWhenActive, textWhenActive, onClick, showClearMark }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition active:scale-95 ${
        active ? "" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
      style={
        active
          ? { backgroundColor: bgWhenActive, color: textWhenActive }
          : undefined
      }
    >
      <span>{label}</span>
      <span
        className={`text-[11px] font-semibold ${active ? "opacity-90" : "text-slate-500"}`}
      >
        · {count}
      </span>
      {showClearMark && (
        <span aria-hidden="true" className="ml-0.5 text-[14px] leading-none opacity-90">
          ✕
        </span>
      )}
    </button>
  );
}

/** Read the persisted filter on mount. Used by TodayPage for hydration-safe init. */
export function readPersistedFilter(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && v.trim() !== "" ? v : null;
  } catch {
    return null;
  }
}
