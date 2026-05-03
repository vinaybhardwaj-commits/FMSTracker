/**
 * src/app/api/devices/onboard/route.ts — Register a device on first launch.
 *
 * Body: { device_uuid: string, name: string, baseline_selfie_url: string }
 * - Upserts on device_uuid (re-onboarding the same device updates name/selfie).
 * - Returns the persisted row.
 */

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

interface Body {
  device_uuid?: string;
  name?: string;
  baseline_selfie_url?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const uuid = (body.device_uuid ?? "").trim();
  const name = (body.name ?? "").trim();
  const selfieUrl = (body.baseline_selfie_url ?? "").trim();

  if (!uuid || uuid.length < 8) {
    return NextResponse.json({ error: "invalid_device_uuid" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  if (!selfieUrl.startsWith("https://")) {
    return NextResponse.json({ error: "selfie_url_required" }, { status: 400 });
  }

  try {
    const { rows } = await sql`
      INSERT INTO devices (device_uuid, name, baseline_selfie_url, last_seen_at)
      VALUES (${uuid}, ${name}, ${selfieUrl}, NOW())
      ON CONFLICT (device_uuid) DO UPDATE SET
        name = EXCLUDED.name,
        baseline_selfie_url = EXCLUDED.baseline_selfie_url,
        last_seen_at = NOW()
      RETURNING id, device_uuid, name, baseline_selfie_url, created_at, last_seen_at
    `;
    return NextResponse.json({ ok: true, device: rows[0] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
