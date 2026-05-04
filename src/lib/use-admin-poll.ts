/**
 * src/lib/use-admin-poll.ts — AD1.1
 *
 * Polling hook for dashboard widgets. PRD §11.4.
 *
 * - Auto-pauses when document.hidden, resumes on visible.
 * - Exponential backoff on errors (1s → 2s → 4s → 30s cap; resets on success).
 * - Caller controls interval; default 60s.
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

  const backoffRef = useRef(intervalMs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const tick = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) {
      // pause loop, will be resumed on visibilitychange
      return;
    }
    setIsFetching(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const result = await fetcher();
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
  }, [fetcher, intervalMs]);

  useEffect(() => {
    mountedRef.current = true;
    tick();
    const onVis = () => {
      if (!document.hidden) {
        // resume immediately
        if (timerRef.current) clearTimeout(timerRef.current);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [tick]);

  const refetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    backoffRef.current = intervalMs;
    tick();
  }, [tick, intervalMs]);

  return { data, error, lastFetched, isFetching, refetch };
}
