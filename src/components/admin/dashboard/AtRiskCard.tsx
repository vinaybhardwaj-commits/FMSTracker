/**
 * src/components/admin/dashboard/AtRiskCard.tsx — AD1.1
 */

"use client";

import Link from "next/link";
import { useAdminPoll } from "@/lib/use-admin-poll";
import { WidgetCard } from "./WidgetCard";

interface AtRiskResp {
  ok: boolean;
  unclaimedPastDue: { instance_id: number; minutes_overdue?: number }[];
  claimsExpiring: { instance_id: number; minutes_left?: number; claimed_by_name?: string | null }[];
  overdue24h: { instance_id: number }[];
}

export function AtRiskCard() {
  const poll = useAdminPoll<AtRiskResp>(
    () => fetch("/api/admin/dashboard/at-risk").then((r) => r.json()),
    60000
  );
  return (
    <WidgetCard
      id="at-risk"
      title="At risk"
      subtitle="Action recommended"
      span="col-span-12 md:col-span-6 lg:col-span-3"
      pollResult={poll}
      isEmpty={(d) =>
        d.unclaimedPastDue.length === 0 &&
        d.claimsExpiring.length === 0 &&
        d.overdue24h.length === 0
      }
      emptyLabel="No items at risk."
    >
      {(d) => (
        <ul className="space-y-2 text-sm">
          {d.overdue24h.length > 0 && (
            <li>
              <Link
                href={"/admin/dashboard?soon=Tasks&sprint=AD1.2" as any}
                className="flex items-baseline justify-between hover:underline"
              >
                <span className="text-slate-700">Overdue &gt; 24h</span>
                <span className="font-bold text-red-600">{d.overdue24h.length}</span>
              </Link>
            </li>
          )}
          {d.unclaimedPastDue.length > 0 && (
            <li>
              <Link
                href={"/admin/dashboard?soon=Tasks&sprint=AD1.2" as any}
                className="flex items-baseline justify-between hover:underline"
              >
                <span className="text-slate-700">Unclaimed past due</span>
                <span className="font-bold text-amber-600">{d.unclaimedPastDue.length}</span>
              </Link>
            </li>
          )}
          {d.claimsExpiring.length > 0 && (
            <li>
              <Link
                href={"/admin/dashboard?soon=Tasks&sprint=AD1.2" as any}
                className="flex items-baseline justify-between hover:underline"
              >
                <span className="text-slate-700">Claims expiring &lt; 30m</span>
                <span className="font-bold text-amber-600">{d.claimsExpiring.length}</span>
              </Link>
            </li>
          )}
        </ul>
      )}
    </WidgetCard>
  );
}
