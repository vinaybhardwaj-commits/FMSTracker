/**
 * src/components/admin/dashboard/CrewOnDutyCard.tsx — AD1.1
 */

"use client";

import Link from "next/link";
import { useAdminPoll } from "@/lib/use-admin-poll";
import { WidgetCard } from "./WidgetCard";

interface CrewResp {
  ok: boolean;
  crew: {
    device_id: string;
    name: string;
    baseline_selfie_url: string | null;
    active_claims: number;
    completed_today: number;
    last_action_at: string | null;
  }[];
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const sec = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export function CrewOnDutyCard() {
  const poll = useAdminPoll<CrewResp>(
    () => fetch("/api/admin/dashboard/crew-on-duty").then((r) => r.json()),
    60000
  );
  return (
    <WidgetCard
      id="crew-on-duty"
      title="Crew on duty"
      subtitle="Active or done today"
      span="col-span-12 lg:col-span-4"
      pollResult={poll}
      isEmpty={(d) => d.crew.length === 0}
      emptyLabel="No crew activity today yet."
    >
      {(d) => (
        <ul className="space-y-2">
          {d.crew.slice(0, 5).map((c) => (
            <li key={c.device_id}>
              <Link
                href={"/admin/dashboard?soon=Crew&sprint=AD1.5" as any}
                className="flex items-center gap-2.5 rounded-md p-1 hover:bg-slate-50"
              >
                {c.baseline_selfie_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.baseline_selfie_url}
                    alt={c.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ehrc-navy">{c.name}</div>
                  <div className="text-xs text-slate-500">
                    {c.completed_today} done · {c.active_claims} active · {relTime(c.last_action_at)}
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {d.crew.length > 5 && (
            <li className="text-xs text-slate-500">+{d.crew.length - 5} more</li>
          )}
        </ul>
      )}
    </WidgetCard>
  );
}
