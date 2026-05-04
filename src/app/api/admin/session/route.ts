/**
 * src/app/api/admin/session/route.ts — AD1.0
 *
 * GET endpoint returning current session metadata. Used by client components
 * (specifically <SessionExpiryWarning>) to know when to fire the 5-min toast.
 *
 * The session cookie itself is HttpOnly so JS can't read its exp directly;
 * this endpoint is the round-trip alternative.
 *
 * PRD §9.5.2 sub-decision §6.3 default.
 */

import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { MAX_EXTENSIONS } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    role: session.role,
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
    extensionCount: session.extensionCount,
    maxExtensions: MAX_EXTENSIONS,
  });
}
