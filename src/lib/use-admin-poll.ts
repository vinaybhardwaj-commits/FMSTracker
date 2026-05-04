/**
 * src/lib/use-admin-poll.ts — AD1.1
 *
 * Polling hook for dashboard widgets. PRD §11.4.
 *
 * - Always fires the first fetch on mount (regardless of visibility) so
 *   widgets populate even if the user opens the page in a background tab.
 * - Subsequent ticks pause when document.hidden = true; resume immediately
 *   on visibilitychange to visible.
 * - Exponential backoff on errors (1s → 2s → 4s → 30s cap; resets on success).
 * - Caller controls interval; default 60s.
 *
 * The fetcher is sync'd into a ref every render, so callers can pass an inline
 * arrow `() => fetch(...).then(r => r.json())` without thrashing the effect.
 */

"use client";

import { useEffect, useRef, useState } from "react";

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

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let backoff = intervalMs;
    let isFirstTick = true;

    const tick = async () => {
      if (!alive) return;
      // First tick always runs; subsequent ticks pause when hidden.
      if (!isFirstTick && typeof document !== "undefined" && document.hidden) {
        return; // visibilitychange listener will resume
      }
      isFirstTick = false;
      setIsFetching(true);
      try {
        const result = await fetcherRef.current();
        if (!alive) return;
        setData(result);
        setError(null);
        setLastFetched(Date.now());
        backoff = intervalMs; // reset backoff on success
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message ?? "Failed to load");
        backoff = Math.min(backoff * 2, 30000);
      } finally {
        if (alive) setIsFetching(false);
        if (alive) timer = setTimeout(tick, backoff);
      }
    };

    refetchRef.current = () => {
      if (timer) clearTimeout(timer);
      backoff = intervalMs;
      isFirstTick = true; // force the next tick to run regardless of visibility
      tick();
    };

    tick();

    const onVis = () => {
      if (!document.hidden && alive) {
        if (timer) clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs]);

  const refetch = () => refetchRef.current();

  return { data, error, lastFetched, isFetching, refetch };
}
