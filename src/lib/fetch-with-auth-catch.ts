/**
 * src/lib/fetch-with-auth-catch.ts — AD1.0
 *
 * Wraps native fetch. When the response is 401, redirects to /admin/pin?next=
 * with the current URL preserved. Used by all v2 client-side mutating calls.
 *
 * PRD §9.5.3.
 */

"use client";

export interface FetchWithAuthCatchOpts {
  /** Optional callback fired before redirect — useful for last-chance state save. */
  onSessionLost?: () => void;
}

export async function fetchWithAuthCatch(
  url: string,
  init?: RequestInit,
  opts?: FetchWithAuthCatchOpts
): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    try {
      opts?.onSessionLost?.();
    } catch {
      // never let onSessionLost throw block the redirect
    }
    if (typeof window !== "undefined") {
      const next = window.location.pathname + window.location.search;
      window.location.replace("/admin/pin?next=" + encodeURIComponent(next));
    }
  }
  return res;
}
