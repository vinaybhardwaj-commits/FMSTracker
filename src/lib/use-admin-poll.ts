/**
 * src/lib/use-admin-poll.ts — AD1.1 (debug-instrumented)
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

let _instanceCount = 0;

export function useAdminPoll<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 60000
): UseAdminPollResult<T> {
  const idRef = useRef<number>(0);
  if (idRef.current === 0) idRef.current = ++_instanceCount;
  const id = idRef.current;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher; // sync every render — refs ignore deps

  const refetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.log(`[useAdminPoll #${id}] mount, intervalMs=${intervalMs}`);
      (window as any).__adminPollDebug = (window as any).__adminPollDebug || [];
      (window as any).__adminPollDebug.push(`#${id} mount`);
    }

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let backoff = intervalMs;

    const tick = async () => {
      if (!alive) return;
      if (typeof document !== "undefined" && document.hidden) return;
      setIsFetching(true);
      console.log(`[useAdminPoll #${id}] before await`, typeof fetcherRef.current);
      try {
        const promise = fetcherRef.current(); console.log(`[useAdminPoll #${id}] called fetcher, got:`, promise); const result = await promise;
        // eslint-disable-next-line no-console
        console.log(`[useAdminPoll #${id}] success`, result);
        if (!alive) return;
        setData(result);
        setError(null);
        setLastFetched(Date.now());
        backoff = intervalMs;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`[useAdminPoll #${id}] error`, e);
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
      // eslint-disable-next-line no-console
      console.log(`[useAdminPoll #${id}] unmount`);
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs, id]);

  const refetch = () => refetchRef.current();

  return { data, error, lastFetched, isFetching, refetch };
}
