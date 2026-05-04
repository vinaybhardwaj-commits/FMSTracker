"use client";
import { useAdminPoll } from "@/lib/use-admin-poll";

interface ActivityRow {
  id: number;
  task_name: string;
  system: string;
  due_date: string;
  status: string;
  completed_at: string | null;
  completed_by_name: string | null;
  vendor_next_due_date: string | null;
}

export function VendorActivityPanel({ vendorId }: { vendorId: number }) {
  const poll = useAdminPoll<{ ok: boolean; activity: ActivityRow[] }>(
    () => fetch(`/api/admin/vendors/${vendorId}/activity`).then((r) => r.json()),
    5 * 60 * 1000
  );
  const items = poll.data?.activity ?? [];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-ehrc-navy">Activity (last 30 days)</div>
        <div className="text-xs text-slate-500">Task instances where this vendor was the AMC vendor</div>
      </div>
      {!poll.data && !poll.error && <div className="space-y-2"><div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" /></div>}
      {poll.data && items.length === 0 && <div className="py-4 text-center text-xs text-slate-500">No activity in last 30 days.</div>}
      {items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {items.slice(0, 8).map((a) => (
            <li key={a.id} className="py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-ehrc-navy">{a.task_name}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${a.status === 'done' ? 'bg-emerald-100 text-emerald-800' : a.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>{a.status}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                <span>{a.due_date}</span>
                {a.completed_by_name && <span>· by {a.completed_by_name}</span>}
                {a.vendor_next_due_date && <span>· next: {a.vendor_next_due_date}</span>}
              </div>
            </li>
          ))}
          {items.length > 8 && <li className="pt-2 text-xs text-slate-500">+{items.length - 8} more</li>}
        </ul>
      )}
    </div>
  );
}
