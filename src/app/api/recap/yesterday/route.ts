/**
 * src/app/api/recap/yesterday/route.ts — GET ?date=YYYY-MM-DD (defaults to yesterday IST).
 *
 * Returns instances grouped by status (done, skipped, missed=overdue).
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { todayInIST } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function yesterdayIST(): string {
  const t = todayInIST();
  const d = new Date(t + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") || yesterdayIST();

  const { rows } = await sql`
    SELECT
      i.id, i.task_name, i.system, i.location_or_asset, i.priority_weight,
      i.status, i.completed_by_name, i.completed_at::text AS completed_at,
      i.selfie_url, i.photo_urls, i.reading_value, i.skip_reason
    FROM task_instances i
    WHERE i.due_date = ${date}::date
    ORDER BY i.priority_weight DESC, i.system, i.task_name
  `;

  const done = rows.filter((r) => r.status === "done");
  const skipped = rows.filter((r) => r.status === "skipped");
  // "missed" = instances that were due on `date` but are still pending/claimed/overdue
  // (i.e., they didn't get done by end of that day and rolled forward)
  const missed = rows.filter((r) => ["pending", "claimed", "overdue"].includes(r.status as string));

  return NextResponse.json({
    date,
    metrics: {
      done: done.length,
      skipped: skipped.length,
      missed: missed.length,
      total: rows.length,
    },
    done,
    skipped,
    missed,
  });
}
