/**
 * src/app/api/admin/pin-extend/route.ts — AD1.0
 *
 * POST endpoint that re-mints the admin session cookie with a fresh 30-min
 * exp, incrementing extension_count. Caps at MAX_EXTENSIONS (4) — beyond that,
 * returns 403; user must re-PIN.
 *
 * Audit-logs every extension (and every cap-rejection).
 *
 * PRD §9.5.2.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  MAX_EXTENSIONS,
  setAdminCookieExtended,
  verifyAdminCookieValue,
} from "@/lib/admin-session";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const raw = req.cookies.get(ADMIN_COOKIE)?.value;
  const session = await verifyAdminCookieValue(raw);
  if (!session) {
    return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
  }

  const currentCount = session.extension_count ?? 0;
  if (currentCount >= MAX_EXTENSIONS) {
    await writeAudit({
      table: "admin_pin",
      recordId: "session",
      action: "update",
      byName: "admin",
      diff: {
        kind: "extension_cap_rejected",
        attempted_count: currentCount + 1,
        cap: MAX_EXTENSIONS,
      },
    });
    return NextResponse.json(
      { ok: false, error: "extension_cap_reached", cap: MAX_EXTENSIONS },
      { status: 403 }
    );
  }

  const { extensionCount, newExp } = await setAdminCookieExtended(session);
  await writeAudit({
    table: "admin_pin",
    recordId: "session",
    action: "update",
    byName: "admin",
    diff: {
      kind: "extension",
      extension_count: extensionCount,
      new_exp: newExp,
    },
  });
  return NextResponse.json({ ok: true, extensionCount, expiresAt: newExp });
}
