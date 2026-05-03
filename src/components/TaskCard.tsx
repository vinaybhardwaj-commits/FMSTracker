/**
 * src/components/TaskCard.tsx — 140px hero unit on S02.
 *
 * Layout:
 *   ┌[stripe]── task name (17px bold, 2-line max) ─────────┐
 *   │           Location · Cadence (14px slate-600)        │
 *   │                                                       │
 *   │  [Full system badge]            [Claim state pill]   │
 *   └───────────────────────────────────────────────────────┘
 */

import Link from "next/link";
import { SystemBadge } from "./SystemBadge";
import { systemMeta } from "@/lib/system-colors";

export interface TaskCardData {
  id: number;
  task_name: string;
  system: string;
  cadence: string | null;
  location_or_asset: string | null;
  status: string; // 'pending' | 'claimed' | 'done' | 'skipped' | 'overdue'
  claimed_by_device: string | null;
  claimed_by_name: string | null;
  claim_expires_at: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  priority_weight: number;
}

function minutesUntil(isoString: string | null): number | null {
  if (!isoString) return null;
  const ms = new Date(isoString).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 60_000));
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  task: TaskCardData;
  /** localStorage device_uuid of the current viewer, to detect Mine vs Other. */
  myDeviceUuid?: string | null;
}

export function TaskCard({ task, myDeviceUuid }: Props) {
  const meta = systemMeta(task.system);
  const isOverdue = task.status === "overdue";
  const isDone = task.status === "done";
  const isSkipped = task.status === "skipped";

  const minutesLeft = minutesUntil(task.claim_expires_at);
  const isMine = task.status === "claimed" && task.claimed_by_device === myDeviceUuid;
  const isOther = task.status === "claimed" && !isMine;

  return (
    <Link
      href={`/instance/${task.id}` as any}
      className={`flex min-h-[140px] gap-3 overflow-hidden rounded-2xl bg-white ring-1 transition active:scale-[0.99] ${
        isOverdue
          ? "ring-orange-300"
          : isDone
          ? "ring-green-200 bg-green-50/40"
          : isSkipped
          ? "ring-slate-200 opacity-70"
          : "ring-slate-200"
      }`}
    >
      {/* Color stripe */}
      <div className="w-1 shrink-0" style={{ background: meta.hex }} aria-hidden />

      <div className="flex flex-1 flex-col justify-between p-3 pr-4">
        <div>
          <div className="line-clamp-2 text-[17px] font-semibold leading-snug text-ehrc-navy">
            {task.task_name}
          </div>
          <div className="mt-1 truncate text-[13px] text-slate-600">
            {task.location_or_asset || "—"}
            {task.cadence && <span className="text-slate-400"> · {capitalize(task.cadence)}</span>}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <SystemBadge system={task.system} variant="full" />
          <ClaimPill
            status={task.status}
            isMine={isMine}
            isOther={isOther}
            minutesLeft={minutesLeft}
            otherName={task.claimed_by_name}
            completedAt={task.completed_at}
            completedByName={task.completed_by_name}
          />
        </div>
      </div>
    </Link>
  );
}

function ClaimPill(props: {
  status: string;
  isMine: boolean;
  isOther: boolean;
  minutesLeft: number | null;
  otherName: string | null;
  completedAt: string | null;
  completedByName: string | null;
}) {
  if (props.status === "done") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
        ✓ {formatTime(props.completedAt)} · {props.completedByName || "—"}
      </span>
    );
  }
  if (props.status === "skipped") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        ⊘ Skipped
      </span>
    );
  }
  if (props.isMine) {
    return (
      <span className="inline-flex items-center rounded-full bg-ehrc-blue px-2 py-0.5 text-[11px] font-medium text-white">
        ● You · {props.minutesLeft ?? "—"} min
      </span>
    );
  }
  if (props.isOther) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700">
        {props.otherName || "Someone"} · {props.minutesLeft ?? "—"} min
      </span>
    );
  }
  // Free
  return (
    <span className="inline-flex items-center rounded-full border border-ehrc-navy/30 px-2 py-0.5 text-[11px] font-medium text-ehrc-navy">
      Tap to claim
    </span>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
