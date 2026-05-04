/**
 * src/components/admin/DraftRestorePrompt.tsx — AD1.0
 *
 * Inline amber bar that surfaces when useFormDraft has detected an unsaved
 * draft from a previous session. Two actions: Restore / Discard.
 *
 * PRD §9.5.1.
 */

"use client";

import { useMemo } from "react";

interface Props {
  savedAt: string; // ISO8601
  onRestore: () => void;
  onDiscard: () => void;
}

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return time;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return `yesterday at ${time}`;
  return `${d.toLocaleDateString()} at ${time}`;
}

export function DraftRestorePrompt({ savedAt, onRestore, onDiscard }: Props) {
  const label = useMemo(() => formatSavedAt(savedAt), [savedAt]);
  return (
    <div
      className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="status"
      aria-live="polite"
    >
      <div>
        <span className="font-medium">Unsaved draft</span> from {label}.
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
