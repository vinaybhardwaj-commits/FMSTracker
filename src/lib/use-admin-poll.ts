/**
 * src/lib/use-admin-poll.ts — AD1.1
 *
 * Polling hook for dashboard widgets. PRD §11.4.
 *
 * - Auto-pauses when document.hidden, resumes on visible.
 * - Exponential backoff on errors (1s → 2s → 4s → 30s cap; resets on success).
 * - Caller controls interval; default 60s.
 *
 * IMPORTANT: We stabilize the fetcher via a ref so callers can pass an inline
 * arrow `() => fetch(...).then(r => r.json())` without causing the polling
 * effect to thrash on every render. The effect runs once per intervalMs change
 * (which is typically constant), not once per fetcher identity.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseAdminPollResult<T> {
  data: T | null;
  error: string | null;
  lastFetched: number | null;
  isFetching: boolean;
  refetch: () => void;
}

export function useAdminPoll<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 60000
): UseAdminPollResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // Ref-stabilize fetcher so re-renders don't re-fire the polling effect.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const backoffRef = useRef(intervalMs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const tick = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) {
      // pause loop, will be resumed on visibilitychange
      return;
    }
    if (mountedRef.current) setIsFetching(true);
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
      setLastFetched(Date.now());
      backoffRef.current = intervalMs; // reset backoff
    } catch (e) {
      if (!mountedRef.current) return;
      setError((e as Error).message ?? "Failed to load");
      // exponential backoff up to 30s
      backoffRef.current = Math.min(backoffRef.current * 2, 30000);
    } finally {
      if (mountedRef.current) setIsFetching(false);
      if (mountedRef.current) {
        timerRef.current = setTimeout(tick, backoffRef.current);
      }
    }
  }, [intervalMs]);

  useEffect(() => {
    mountedRef.current = true;
    tick();
    const onVis = () => {
      if (!document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tick]);

  const refetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    backoffRef.current = intervalMs;
    tick();
  }, [tick, intervalMs]);

  return { data, error, lastFetched, isFetching, refetch };
}
