/**
 * src/lib/admin-auth.ts — AD1.0
 *
 * Auth abstraction for admin v2. Single source of truth for "who is the current
 * admin user, and what can they do?"
 *
 * v1.0: always returns role='admin' on a valid PIN session.
 * v1.1: will derive viewer role from a separate cookie / claim, no callers
 *       upstream need to change because they only read .role and call isWriteAllowed.
 *
 * IMPORTANT: this is the v2 abstraction. v1 admin API routes still import
 * `getAdminSession` from `@/lib/admin-session` (raw AdminSession). New v2 routes
 * should import from here.
 */

import {
  ADMIN_COOKIE,
  verifyAdminCookieValue,
  type AdminSession,
} from "./admin-session";
import { cookies } from "next/headers";

export type AdminRole = "admin" | "viewer";

export interface AdminAuthSession {
  role: AdminRole;
  /** Stable per-cookie identifier for audit logging. Rotates on PIN re-entry / extend. */
  sessionId: string;
  /** Cookie expiry in ms epoch. */
  expiresAt: number;
  /** Times this session has been extended via /api/admin/pin-extend. */
  extensionCount: number;
}

function deriveSessionId(payload: AdminSession): string {
  const seed = `${payload.iat}:${payload.exp}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `s_${Math.abs(hash).toString(36)}_${payload.iat % 1000000}`;
}

/**
 * Returns the rich auth session, or null if no valid PIN cookie. Used by:
 *  - v2 API routes (`/api/admin/pin-extend`, `/api/admin/session`)
 *  - v2 server components (`/admin/(v2)/dashboard/page.tsx`, etc.)
 */
export async function getAdminSession(): Promise<AdminAuthSession | null> {
  const c = await cookies();
  const raw = c.get(ADMIN_COOKIE)?.value;
  const session = await verifyAdminCookieValue(raw);
  if (!session) return null;

  return {
    role: "admin",
    sessionId: deriveSessionId(session),
    expiresAt: session.exp,
    extensionCount: session.extension_count ?? 0,
  };
}

export function isWriteAllowed(role: AdminRole): boolean {
  return role === "admin";
}
