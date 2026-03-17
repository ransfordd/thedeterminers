import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const MAINTENANCE_STATUS_CACHE_MAX_AGE = 30;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/maintenance-status" ||
    pathname === "/login" ||
    pathname === "/maintenance" ||
    pathname === "/signup" ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const isAdmin = (token?.role as string) === "business_admin";
  if (isAdmin) {
    return NextResponse.next();
  }

  try {
    const origin = request.nextUrl.origin;
    const res = await fetch(`${origin}/api/maintenance-status`, {
      next: { revalidate: MAINTENANCE_STATUS_CACHE_MAX_AGE },
      headers: { "x-middleware-skip": "1" },
    });
    if (!res.ok) return NextResponse.next();
    const data = await res.json();
    if (data.maintenanceMode) {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }
  } catch {
    // If we can't reach the API (e.g. cold start), allow request through
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/auth).*)"],
};
