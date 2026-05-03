/**
 * src/app/api/admin/pin-logout/route.ts
 *
 * POST → clear admin session cookie. Always 200.
 */

import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function POST() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
