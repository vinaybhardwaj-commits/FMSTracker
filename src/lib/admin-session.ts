/**
 * src/lib/admin-session.ts
 *
 * Single shared admin-PIN session: HMAC-signed cookie holding (issued_at, exp).
 * No DB, no JWT lib — `crypto` only. 30 min TTL, sliding renewal disabled
 * (re-PIN every 30 min, per PRD §S09).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fms_admin_session";
const TTL_MS = 30 * 60 * 1000; // 30 min

function getSecret(): string {
  const s = process.env.FMS_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "FMS_SESSION_SECRET is not set or too short (need >=32 chars). Set in Vercel + .env.local."
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export interface AdminSession {
  iat: number;
  exp: number;
}

/** Build the cookie value: `<base64(payload)>.<hex(hmac(payload))>`. */
export function mintAdminCookieValue(): { value: string; expires: Date } {
  const now = Date.now();
  const payload: AdminSession = { iat: now, exp: now + TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(payloadB64);
  return { value: `${payloadB64}.${sig}`, expires: new Date(payload.exp) };
}

/** Verify cookie value, return session if valid + unexpired, else null. */
export function verifyAdminCookieValue(raw: string | undefined): AdminSession | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  let expectedSig: string;
  try {
    expectedSig = sign(payloadB64);
  } catch {
    return null; // missing secret
  }
  if (!safeEq(sig, expectedSig)) return null;
  let parsed: AdminSession;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
  return parsed;
}

/** Read+verify the session from request cookies (server components / route handlers). */
export async function getAdminSession(): Promise<AdminSession | null> {
  const c = await cookies();
  return verifyAdminCookieValue(c.get(ADMIN_COOKIE)?.value);
}

/** Set the session cookie. */
export async function setAdminCookie(): Promise<void> {
  const { value, expires } = mintAdminCookieValue();
  const c = await cookies();
  c.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** Clear the session cookie (logout / "Lock"). */
export async function clearAdminCookie(): Promise<void> {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
}
