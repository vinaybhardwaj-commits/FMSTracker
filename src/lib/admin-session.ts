/**
 * src/lib/admin-session.ts
 *
 * Edge-safe HMAC-signed admin session cookie. Uses Web Crypto API (crypto.subtle)
 * — works in both edge middleware and Node API routes.
 *
 * Cookie format: `<base64url(payload)>.<base64url(hmac(payload))>`
 * Payload: { iat, exp } in ms. TTL 30 min, no sliding renewal.
 */

import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fms_admin_session";
const TTL_MS = 30 * 60 * 1000;

function getSecret(): string {
  const s = process.env.FMS_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "FMS_SESSION_SECRET is not set or too short (need >=32 chars)."
    );
  }
  return s;
}

function utf8(s: string): ArrayBuffer {
  // Slice into a fresh ArrayBuffer (not SharedArrayBuffer) for strict Web Crypto types
  const u8 = new TextEncoder().encode(s);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

function bytesToB64Url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlToBytes(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    utf8(secret) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(payloadB64: string): Promise<string> {
  const key = await importKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, utf8(payloadB64));
  return bytesToB64Url(sig);
}

async function verifyPayload(payloadB64: string, sig: string): Promise<boolean> {
  let sigBuf: ArrayBuffer;
  try {
    sigBuf = b64UrlToBytes(sig);
  } catch {
    return false;
  }
  let key: CryptoKey;
  try {
    key = await importKey(getSecret());
  } catch {
    return false;
  }
  return crypto.subtle.verify("HMAC", key, sigBuf, utf8(payloadB64));
}

export interface AdminSession {
  iat: number;
  exp: number;
}

export async function mintAdminCookieValue(): Promise<{ value: string; expires: Date }> {
  const now = Date.now();
  const payload: AdminSession = { iat: now, exp: now + TTL_MS };
  const payloadB64 = bytesToB64Url(utf8(JSON.stringify(payload)));
  const sig = await signPayload(payloadB64);
  return { value: `${payloadB64}.${sig}`, expires: new Date(payload.exp) };
}

export async function verifyAdminCookieValue(raw: string | undefined): Promise<AdminSession | null> {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const ok = await verifyPayload(payloadB64, sig);
  if (!ok) return null;
  let parsed: AdminSession;
  try {
    const json = new TextDecoder().decode(b64UrlToBytes(payloadB64));
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
  return parsed;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const c = await cookies();
  return verifyAdminCookieValue(c.get(ADMIN_COOKIE)?.value);
}

export async function setAdminCookie(): Promise<void> {
  const { value, expires } = await mintAdminCookieValue();
  const c = await cookies();
  c.set(ADMIN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
}
