/**
 * src/app/api/admin/audit/route.ts — paginated audit log query.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "100", 10));
  const action = sp.get("action");
  const tableName = sp.get("table");

  const conds: string[] = [];
  const args: unknown[] = [];
  function bind(v: unknown) { args.push(v); return `$${args.length}`; }
  if (action) conds.push(`action = ${bind(action)}`);
  if (tableName) conds.push(`table_name = ${bind(tableName)}`);
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const queryText = `
    SELECT id, table_name, record_id, action, changed_by_name,
           created_at::text AS created_at, diff
    FROM audit_log
    ${where}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  const { rows } = await (sql as any).query(queryText, args);
  return NextResponse.json({ rows });
}
