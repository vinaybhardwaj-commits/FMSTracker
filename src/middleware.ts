/**
 * src/middleware.ts
 *
 * Edge middleware that gates /admin/* (except /admin/pin) by checking
 * the fms_admin_session cookie. We CANNOT use bcryptjs at the edge, so
 * the middleware just verifies the HMAC-signed session cookie. The actual
 * PIN check + bcrypt compare lives in /api/admin/pin-verify (Node runtime).
 *
 * Unauthenticated requests redirect to /admin/pin?next=<original-path>.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookieValue, ADMIN_COOKIE } from "@/lib/admin-session";

export const config = {
  matcher: ["/admin/:path*"],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin/pin and /api/admin/pin-* are always reachable without a session
  if (pathname === "/admin/pin" || pathname.startsWith("/admin/pin/")) {
    return NextResponse.next();
  }

  const raw = req.cookies.get(ADMIN_COOKIE)?.value;
  const session = verifyAdminCookieValue(raw);
  if (session) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/pin";
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}
