/**
 * src/components/admin/dashboard/StatusBanner.tsx — AD1.1
 *
 * Conditional full-width banner. Renders red/amber when thresholds tripped;
 * hidden when everything's green. Reads from at-risk + statutory pollers.
 *
 * PRD §6.3 thresholds:
 *  - red: any task overdue > 24h, OR any statutory expired or expiring < 7d
 *  - amber: any active claim > 8h (deferred — needs claim-age signal)
 *  - green: hidden
 *
 * v1.0 surfaces the top 3 most-critical items as clickable rows.
 */

"use client";

import Link from "next/link";
import { useAdminPoll } from "@/lib/use-admin-poll";
import { IconAlertTriangle } from "../icons";

interface AtRiskRow {
  instance_id: number;
  task_name: string;
  system: string;
  due_date: string;
}
interface StatutoryRow {
  id: number;
  item: string;
  current_expiry: string;
  days_remaining: number;
}

export function StatusBanner() {
  const atRisk = useAdminPoll<{ ok: boolean; overdue24h: AtRiskRow[] }>(
    () => fetch("/api/admin/dashboard/at-risk").then((r) => r.json()),
    60000
  );
  const stat = useAdminPoll<{ ok: boolean; items: StatutoryRow[] }>(
    () => fetch("/api/admin/dashboard/statutory-expiring").then((r) => r.json()),
    60000
  );

  const overdueRows = atRisk.data?.overdue24h ?? [];
  const expiringSoonRows = (stat.data?.items ?? []).filter(
    (s) => s.days_remaining < 7
  );

  if (overdueRows.length === 0 && expiringSoonRows.length === 0) return null;

  const isRed = overdueRows.length > 0 || expiringSoonRows.some((s) => s.days_remaining <= 0);
  const tone = isRed
    ? "border-red-300 bg-red-50 text-red-900"
    : "border-amber-300 bg-amber-50 text-amber-900";

  return (
    <div
      className={`mb-6 rounded-xl border ${tone} p-4`}
      role="alert"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <IconAlertTriangle className="h-4 w-4" />
        {isRed ? "Critical attention needed" : "Attention soon"}
      </div>
      <ul className="space-y-1 text-sm">
        {overdueRows.slice(0, 3).map((r) => (
          <li key={`o-${r.instance_id}`}>
            <Link
              href={"/admin/dashboard?soon=Tasks&sprint=AD1.2" as any}
              className="hover:underline"
            >
              <span className="font-medium">[{r.system}]</span> {r.task_name} — overdue since{" "}
              {new Date(r.due_date).toLocaleDateString()}
            </Link>
          </li>
        ))}
        {expiringSoonRows.slice(0, 3).map((s) => (
          <li key={`s-${s.id}`}>
            <Link href={"/admin/statutory" as any} className="hover:underline">
              <span className="font-medium">Statutory:</span> {s.item} —{" "}
              {s.days_remaining <= 0
                ? `expired ${Math.abs(s.days_remaining)}d ago`
                : `expires in ${s.days_remaining}d`}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
