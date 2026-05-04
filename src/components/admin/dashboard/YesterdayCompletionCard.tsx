/**
 * src/components/admin/dashboard/YesterdayCompletionCard.tsx — AD1.1
 */

"use client";

import { useAdminPoll } from "@/lib/use-admin-poll";
import { WidgetCard } from "./WidgetCard";

interface YesterdayResp {
  ok: boolean;
  total: number;
  done: number;
  overdue: number;
  skipped: number;
  completionPct: number | null;
  missingSelfie: number;
  missingPhotos: number;
  weekAvgPct: number | null;
}

export function YesterdayCompletionCard() {
  const poll = useAdminPoll<YesterdayResp>(
    () => fetch("/api/admin/dashboard/yesterday-completion").then((r) => r.json()),
    60 * 60 * 1000 // hourly — yesterday's data is stable
  );
  return (
    <WidgetCard
      id="yesterday-completion"
      title="Yesterday"
      subtitle="Completion summary"
      span="col-span-12 md:col-span-6 lg:col-span-3"
      pollResult={poll}
      isEmpty={(d) => d.total === 0}
      emptyLabel="No tasks were due yesterday."
    >
      {(d) => {
        const pct = d.completionPct ?? 0;
        const delta =
          d.completionPct != null && d.weekAvgPct != null
            ? d.completionPct - d.weekAvgPct
            : null;
        const deltaTone =
          delta == null
            ? ""
            : delta >= 0
            ? "text-emerald-600"
            : "text-red-600";
        return (
          <div>
            <div className="mb-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold text-ehrc-navy">{pct}%</div>
              {delta != null && (
                <div className={`text-xs font-medium ${deltaTone}`}>
                  {delta >= 0 ? "+" : ""}
                  {delta}pt vs 7-day avg
                </div>
              )}
            </div>
            <div className="text-xs text-slate-600">
              <span className="font-medium text-ehrc-navy">{d.done}</span> of{" "}
              <span className="font-medium text-ehrc-navy">{d.total}</span> completed
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-slate-600">
              {d.overdue > 0 && (
                <div>
                  <span className="font-medium text-red-700">{d.overdue}</span> still overdue
                </div>
              )}
              {d.missingSelfie > 0 && (
                <div>
                  <span className="font-medium text-amber-700">{d.missingSelfie}</span> done without selfie
                </div>
              )}
              {d.missingPhotos > 0 && (
                <div>
                  <span className="font-medium text-amber-700">{d.missingPhotos}</span> done without photos
                </div>
              )}
              {d.skipped > 0 && (
                <div>
                  <span className="font-medium text-slate-700">{d.skipped}</span> skipped
                </div>
              )}
            </div>
          </div>
        );
      }}
    </WidgetCard>
  );
}
