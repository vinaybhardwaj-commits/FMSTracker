/**
 * src/components/admin/dashboard/DashboardClient.tsx — AD1.1
 *
 * Client-side composition of the dashboard. Server component (page.tsx) just
 * gates auth and renders this. All widgets poll their own APIs.
 */

"use client";

import { StatusBanner } from "./StatusBanner";
import { TodaySnapshotCard } from "./TodaySnapshotCard";
import { YesterdayCompletionCard } from "./YesterdayCompletionCard";
import { AtRiskCard } from "./AtRiskCard";
import { StatutoryExpiringCard } from "./StatutoryExpiringCard";
import { CompletionTrendCard } from "./CompletionTrendCard";
import { CrewOnDutyCard } from "./CrewOnDutyCard";
import { RecentAuditCard } from "./RecentAuditCard";

export function DashboardClient() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ehrc-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Operational status · refreshes every 60s
        </p>
      </div>

      <StatusBanner />

      <div className="grid grid-cols-12 gap-4">
        <TodaySnapshotCard />
        <YesterdayCompletionCard />
        <AtRiskCard />
        <StatutoryExpiringCard />
        <CompletionTrendCard />
        <CrewOnDutyCard />
        <RecentAuditCard />
      </div>
    </div>
  );
}
