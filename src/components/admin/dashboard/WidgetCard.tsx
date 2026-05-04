/**
 * src/components/admin/dashboard/WidgetCard.tsx — AD1.1
 *
 * Shared chrome for every dashboard widget: title bar, slot for body,
 * 4-state machine (loading skeleton, populated, empty, error). Caller passes
 * its own poll result + render fn for the populated state.
 */

"use client";

import { useEffect } from "react";
import { useDashboardRefresh } from "./refresh-context";
import type { UseAdminPollResult } from "@/lib/use-admin-poll";

interface WidgetCardProps<T> {
  /** Stable id; used by the refresh bus. */
  id: string;
  title: string;
  subtitle?: string;
  /** Tailwind grid-col classes — e.g. "col-span-3" or "col-span-8". */
  span: string;
  pollResult: UseAdminPollResult<T>;
  /** Predicate that returns true if the data has nothing meaningful to show. */
  isEmpty?: (data: T) => boolean;
  emptyLabel?: string;
  children: (data: T) => React.ReactNode;
}

export function WidgetCard<T>({
  id,
  title,
  subtitle,
  span,
  pollResult,
  isEmpty,
  emptyLabel = "No data.",
  children,
}: WidgetCardProps<T>) {
  const { register, reportFetched } = useDashboardRefresh();

  useEffect(() => {
    const unregister = register(id, pollResult.refetch);
    return unregister;
  }, [id, register, pollResult.refetch]);

  useEffect(() => {
    if (pollResult.lastFetched) reportFetched(id, pollResult.lastFetched);
  }, [id, pollResult.lastFetched, reportFetched]);

  const empty =
    pollResult.data && isEmpty ? isEmpty(pollResult.data) : false;

  return (
    <div className={`${span} rounded-xl border border-slate-200 bg-white p-4`}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold text-ehrc-navy">{title}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
        </div>
        {pollResult.isFetching && pollResult.data && (
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            updating…
          </div>
        )}
      </div>

      {pollResult.error && !pollResult.data && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <div className="font-medium">Couldn&apos;t load.</div>
          <div className="mt-0.5 text-red-700">{pollResult.error}</div>
          <button
            type="button"
            onClick={pollResult.refetch}
            className="mt-2 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {!pollResult.error && !pollResult.data && (
        <SkeletonRows />
      )}

      {pollResult.data && !empty && children(pollResult.data)}

      {pollResult.data && empty && (
        <div className="py-4 text-center text-sm text-slate-500">{emptyLabel}</div>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
    </div>
  );
}
