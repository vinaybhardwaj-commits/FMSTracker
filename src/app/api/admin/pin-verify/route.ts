/**
 * src/app/api/admin/pin-verify/route.ts
 *
 * POST { pin: "0000" } → bcrypt compare against FMS_ADMIN_PIN_HASH.
 * Sets fms_admin_session cookie on success. Rate-limited per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { setAdminCookie } from "@/lib/admin-session";
import { isLocked, recordFailure, clearFailures } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

function getIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const lock = isLocked(ip);
  if (lock.locked) {
    return NextResponse.json(
      { ok: false, error: "locked", retryAfterMs: lock.retryAfterMs },
      { status: 429 }
    );
  }

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const pin = body?.pin;
  if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ ok: false, error: "invalid_pin_format" }, { status: 400 });
  }

  const hash = process.env.FMS_ADMIN_PIN_HASH;
  if (!hash) {
    console.error("FMS_ADMIN_PIN_HASH is not set on the server.");
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const match = await compare(pin, hash);
  if (!match) {
    const { remaining } = recordFailure(ip);
    await writeAudit({
      table: "admin_pin",
      recordId: `ip:${ip}`,
      action: "pin_failure",
      byName: "system",
      diff: { ip, remaining },
    });
    return NextResponse.json({ ok: false, error: "wrong_pin", remaining }, { status: 401 });
  }

  clearFailures(ip);
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
