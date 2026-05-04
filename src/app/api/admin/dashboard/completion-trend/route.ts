/**
 * GET /api/admin/dashboard/completion-trend — AD1.1
 * Returns 14-day series of daily completion %.
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { queryCompletionTrend } from "@/lib/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
  try {
    const series = await queryCompletionTrend(14);
    return NextResponse.json({ ok: true, generated_at: new Date().toISOString(), series });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
