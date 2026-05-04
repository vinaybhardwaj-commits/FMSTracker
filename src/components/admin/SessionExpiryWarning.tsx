/**
 * src/components/admin/SessionExpiryWarning.tsx — AD1.0
 *
 * Toast-style warning that appears 5 minutes before the admin session expires.
 * Offers an "Extend session" action that POSTs /api/admin/pin-extend.
 *
 * PRD §9.5.2.
 *
 * Reads session metadata from /api/admin/session (HttpOnly cookie can't be read
 * from JS, so we round-trip the server for exp).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { IconClock, IconAlertTriangle } from "./icons";
import { fetchWithAuthCatch } from "@/lib/fetch-with-auth-catch";

const WARN_BEFORE_MS = 5 * 60 * 1000; // toast appears 5 min before expiry
const POLL_INTERVAL_MS = 60 * 1000; // re-check session metadata every minute

interface SessionMeta {
  expiresAt: number;
  extensionCount: number;
  maxExtensions: number;
}

export function SessionExpiryWarning() {
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [extending, setExtending] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch session metadata on mount + every POLL_INTERVAL_MS
  useEffect(() => {
    let cancelled = false;
    async function pull() {
      try {
        const res = await fetch("/api/admin/session");
        if (!res.ok) return;
        const data = (await res.json()) as SessionMeta;
        if (!cancelled) setMeta(data);
      } catch {
        // network blip — keep last known meta
      }
    }
    pull();
    const id = setInterval(pull, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Schedule the toast trigger
  useEffect(() => {
    if (!meta) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const ms = meta.expiresAt - Date.now() - WARN_BEFORE_MS;
    if (ms <= 0) {
      setShowToast(true);
      return;
    }
    timerRef.current = setTimeout(() => setShowToast(true), ms);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [meta]);

  // After dismissal, allow re-show on next session change
  useEffect(() => {
    if (!showToast) setDismissed(false);
  }, [showToast]);

  async function handleExtend() {
    setExtending(true);
    try {
      const res = await fetchWithAuthCatch("/api/admin/pin-extend", { method: "POST" });
      if (res.status === 403) {
        setCapReached(true);
      } else if (res.ok) {
        // Refresh meta and dismiss toast
        const r = await fetch("/api/admin/session");
        if (r.ok) setMeta((await r.json()) as SessionMeta);
        setShowToast(false);
        setDismissed(true);
      }
    } catch {
      // 401 will redirect via fetchWithAuthCatch
    } finally {
      setExtending(false);
    }
  }

  if (!showToast || dismissed) return null;
  if (!meta) return null;

  const minutesLeft = Math.max(
    0,
    Math.round((meta.expiresAt - Date.now()) / 60000)
  );

  return (
    <div
      className="fixed left-1/2 top-4 z-50 flex max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border border-amber-300 bg-white px-4 py-3 shadow-lg"
      role="alertdialog"
      aria-labelledby="sex-title"
    >
      <div className="mt-0.5 text-amber-600">
        {capReached ? <IconAlertTriangle className="h-5 w-5" /> : <IconClock className="h-5 w-5" />}
      </div>
      <div className="flex-1">
        <div id="sex-title" className="text-sm font-semibold text-ehrc-navy">
          {capReached ? "Extension limit reached" : `Session expires in ${minutesLeft} min`}
        </div>
        <div className="mt-0.5 text-xs text-slate-600">
          {capReached
            ? "Re-enter PIN to continue."
            : "Save your work or you'll need to re-enter PIN."}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Dismiss
          </button>
          {!capReached && (
            <button
              type="button"
              onClick={handleExtend}
              disabled={extending}
              className="rounded-md bg-ehrc-blue px-3 py-1 text-xs font-medium text-white hover:bg-ehrc-blue/90 disabled:opacity-50"
            >
              {extending ? "Extending…" : "Extend session"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
