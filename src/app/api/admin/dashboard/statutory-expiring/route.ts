/**
 * GET /api/admin/dashboard/statutory-expiring — AD1.1
 */
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { queryStatutoryExpiring } from "@/lib/dashboard-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "no_session" }, { status: 401 });
  try {
    const items = await queryStatutoryExpiring(30);
    return NextResponse.json({ ok: true, generated_at: new Date().toISOString(), items });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
