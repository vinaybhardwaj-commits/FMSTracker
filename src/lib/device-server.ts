/**
 * src/lib/device-server.ts — Server-side device identity helpers.
 *
 * Workers POSTing claim/release/skip/complete must send their device_uuid
 * in the body. We resolve it to devices.id (UUID PK) for FK fields.
 */

import { sql } from "@/lib/db";

export interface DeviceRow {
  id: string; // UUID
  device_uuid: string;
  name: string;
}

export async function resolveDevice(deviceUuid: string | null | undefined): Promise<DeviceRow | null> {
  if (!deviceUuid) return null;
  const trimmed = deviceUuid.trim();
  if (trimmed.length < 8) return null;
  const { rows } = await sql<DeviceRow>`
    SELECT id::text, device_uuid, name FROM devices WHERE device_uuid = ${trimmed}
  `;
  if (!rows[0]) return null;
  // touch last_seen_at (fire-and-forget; safe to await)
  await sql`UPDATE devices SET last_seen_at = NOW() WHERE device_uuid = ${trimmed}`;
  return rows[0];
}
