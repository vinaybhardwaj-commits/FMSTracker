/**
 * src/components/admin/dashboard/refresh-context.tsx — AD1.1
 *
 * Refresh bus that connects:
 *  - Top header Refresh button → triggers all widget pollers to refetch.
 *  - Top header UpdatedAgoChip → reads earliest lastFetched across widgets.
 *  - Widgets register their refetch fn + lastFetched on mount.
 */

"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type RefetchFn = () => void;

interface RefreshContextValue {
  register: (id: string, refetch: RefetchFn) => () => void;
  reportFetched: (id: string, ts: number) => void;
  triggerRefreshAll: () => void;
  earliestFetched: number | null;
}

const RefreshContext = createContext<RefreshContextValue | null>(null);

export function DashboardRefreshProvider({ children }: { children: ReactNode }) {
  const refetchersRef = useRef<Map<string, RefetchFn>>(new Map());
  const [fetchedTimes, setFetchedTimes] = useState<Map<string, number>>(new Map());

  const register = useCallback((id: string, refetch: RefetchFn) => {
    refetchersRef.current.set(id, refetch);
    return () => {
      refetchersRef.current.delete(id);
      setFetchedTimes((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    };
  }, []);

  const reportFetched = useCallback((id: string, ts: number) => {
    setFetchedTimes((prev) => {
      const next = new Map(prev);
      next.set(id, ts);
      return next;
    });
  }, []);

  const triggerRefreshAll = useCallback(() => {
    refetchersRef.current.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore — one bad widget doesn't break refresh
      }
    });
  }, []);

  const earliestFetched =
    fetchedTimes.size === 0
      ? null
      : Math.min(...Array.from(fetchedTimes.values()));

  return (
    <RefreshContext.Provider
      value={{ register, reportFetched, triggerRefreshAll, earliestFetched }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useDashboardRefresh(): RefreshContextValue {
  const ctx = useContext(RefreshContext);
  if (!ctx) {
    // Safe fallback for components that mount outside provider (e.g., on a
    // future module before its DashboardRefreshProvider). No-op stub.
    return {
      register: () => () => {},
      reportFetched: () => {},
      triggerRefreshAll: () => {},
      earliestFetched: null,
    };
  }
  return ctx;
}
