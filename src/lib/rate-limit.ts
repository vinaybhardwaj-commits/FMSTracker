/**
 * src/lib/rate-limit.ts
 *
 * In-memory sliding-window rate limit per key (IP for PIN failures).
 * 5 failures per hour → lockout. Resets on success.
 *
 * Single-instance Vercel function memory is OK for v1 (only 1-2 admins
 * ever hit the PIN gate; cross-instance leakage is acceptable). For multi-
 * region or higher security, swap to Vercel KV.
 */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_FAILS = 5;

const failures = new Map<string, number[]>();

export function recordFailure(key: string): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const arr = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  failures.set(key, arr);
  const remaining = Math.max(0, MAX_FAILS - arr.length);
  const retryAfterMs = arr.length >= MAX_FAILS ? WINDOW_MS - (now - arr[0]) : 0;
  return { allowed: arr.length < MAX_FAILS, remaining, retryAfterMs };
}

export function isLocked(key: string): { locked: boolean; retryAfterMs: number } {
  const now = Date.now();
  const arr = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_FAILS) {
    return { locked: true, retryAfterMs: WINDOW_MS - (now - arr[0]) };
  }
  return { locked: false, retryAfterMs: 0 };
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
