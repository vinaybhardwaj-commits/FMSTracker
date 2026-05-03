/**
 * src/middleware.ts
 *
 * Edge middleware that gates /admin/* (except /admin/pin) by verifying the
 * fms_admin_session HMAC-signed cookie via Web Crypto API.
 * The PIN check + bcrypt compare lives in /api/admin/pin-verify (Node runtime).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookieValue, ADMIN_COOKIE } from "@/lib/admin-session";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/pin" || pathname.startsWith("/admin/pin/")) {
    return NextResponse.next();
  }

  const raw = req.cookies.get(ADMIN_COOKIE)?.value;
  const session = await verifyAdminCookieValue(raw);
  if (session) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/pin";
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}
