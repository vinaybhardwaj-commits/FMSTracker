/**
 * src/lib/cron-auth.ts — Verify Vercel Cron's Bearer token.
 *
 * Vercel cron requests include `Authorization: Bearer ${CRON_SECRET}` (env var
 * we set in Vercel + locally). Returns true on match (or when no CRON_SECRET
 * is configured — useful for local dev when running `pnpm tsx scripts/...`).
 */

import { NextRequest } from "next/server";

export function isAuthorizedCron(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Dev/local: no secret configured → allow (with a console warning)
    console.warn("CRON_SECRET not set — cron auth bypassed");
    return true;
  }
  const got = req.headers.get("authorization") ?? "";
  return got === `Bearer ${expected}`;
}
