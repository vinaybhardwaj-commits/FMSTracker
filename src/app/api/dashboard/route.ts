/**
 * src/app/api/dashboard/route.ts — S08 data payload (read-only, public).
 */

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { todayInIST } from "@/lib/engine";
import { tierForExpiry } from "@/lib/statutory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const today = todayInIST();

  // KPIs
  const { rows: today_kpis } = await sql<{ total: number; done: number; overdue: number }>`
    SELECT
      COUNT(*) FILTER (WHERE due_date = ${today}::date)::int AS total,
      COUNT(*) FILTER (WHERE due_date = ${today}::date AND status = 'done')::int AS done,
      COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue
    FROM task_instances
  `;

  // Statutory tiers
  const { rows: stat } = await sql<{ id: number; licence_id: string | null; item: string; current_expiry: string | null }>`
    SELECT id, licence_id, item, current_expiry::text AS current_expiry
    FROM statutory_items WHERE active = TRUE
  `;
  const statutory_tiered = stat.map((s) => ({ ...s, ...tierForExpiry(s.current_expiry) }));
  const statutory_red_critical = statutory_tiered.filter((s) => s.tier === "red" || s.tier === "critical").length;

  // System health: 7-day rolling per-system completion %
  const { rows: systems } = await sql<{ system: string; total: number; done: number }>`
    SELECT system,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'done')::int AS done
    FROM task_instances
    WHERE due_date >= (${today}::date - INTERVAL '6 days') AND due_date <= ${today}::date
    GROUP BY system
    ORDER BY system
  `;

  // 30-day trend per-day completion %
  const { rows: trend } = await sql<{ day: string; total: number; done: number }>`
    SELECT due_date::text AS day,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'done')::int AS done
    FROM task_instances
    WHERE due_date >= (${today}::date - INTERVAL '29 days') AND due_date <= ${today}::date
    GROUP BY due_date
    ORDER BY due_date
  `;

  // Recent activity — last 50 done
  const { rows: activity } = await sql<{
    id: number; task_name: string; system: string;
    completed_by_name: string | null; completed_at: string | null;
    selfie_url: string | null; photo_urls: string[] | null;
  }>`
    SELECT id, task_name, system, completed_by_name,
           completed_at::text AS completed_at,
           selfie_url, photo_urls
    FROM task_instances
    WHERE status = 'done' AND completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 50
  `;

  return NextResponse.json({
    today,
    kpis: {
      today_done: today_kpis[0].done,
      today_total: today_kpis[0].total,
      today_pct: today_kpis[0].total > 0 ? today_kpis[0].done / today_kpis[0].total : null,
      overdue: today_kpis[0].overdue,
      statutory_red_critical,
    },
    systems,
    statutory: statutory_tiered.sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999)),
    trend,
    activity,
  });
}
