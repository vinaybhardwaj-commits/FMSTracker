/**
 * src/app/api/cron/cleanup-claims/route.ts — Every 15 minutes.
 *
 * Frees claims whose 30-min window has expired. Lightweight.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { expireClaims } from "@/lib/engine";

export const runtime = "nodejs";

async function handle(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await expireClaims();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("cleanup-claims cron failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
