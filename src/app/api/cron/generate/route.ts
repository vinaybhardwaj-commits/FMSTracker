/**
 * src/app/api/cron/generate/route.ts — Daily 04:00 IST = 22:30 UTC.
 *
 * Marks carryovers as overdue, then generates today's new instances.
 * GET so Vercel Cron can hit it; also supports POST for manual trigger.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { generateForToday } from "@/lib/engine";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await generateForToday();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("generate cron failed:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
