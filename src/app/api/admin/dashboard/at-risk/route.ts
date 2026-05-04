/**
 * GET /api/admin/dashboard/at-risk — AD1.1
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { queryAtRisk } from "@/lib/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
  try {
    const data = await queryAtRisk();
    return NextResponse.json({ ok: true, generated_at: new Date().toISOString(), ...data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
