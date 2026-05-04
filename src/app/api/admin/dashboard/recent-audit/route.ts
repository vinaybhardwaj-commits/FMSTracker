/**
 * GET /api/admin/dashboard/recent-audit — AD1.1
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { queryRecentAudit } from "@/lib/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
  const url = new URL(req.url);
  const hours = Number(url.searchParams.get("hours") ?? 24);
  const limit = Number(url.searchParams.get("limit") ?? 10);
  try {
    const events = await queryRecentAudit(hours, limit);
    return NextResponse.json({ ok: true, generated_at: new Date().toISOString(), events });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
