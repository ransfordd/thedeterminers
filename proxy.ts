import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const MAINTENANCE_STATUS_CACHE_MAX_AGE = 30;

const rolePaths: Record<string, string> = {
  business_admin: "/admin",
  manager: "/manager",
  agent: "/agent",
  client: "/client",
};

function isDashboardPath(path: string): boolean {
  return (
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path.startsWith("/admin") ||
    path.startsWith("/manager") ||
    path.startsWith("/agent") ||
    path.startsWith("/client")
  );
}

function skipMaintenanceAndEarlyNext(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/uploads/") ||
    pathname === "/api/maintenance-status" ||
    pathname === "/login" ||
    pathname === "/maintenance" ||
    pathname === "/signup" ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".")
  );
}

/** Public site paths that remain accessible when maintenance mode is on (match PHP behaviour). */
function isPublicPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/about" || pathname === "/contact" || pathname === "/home";
}

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (skipMaintenanceAndEarlyNext(path)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const role = token?.role as string | undefined;

  if (role !== "business_admin") {
    try {
      const origin = request.nextUrl.origin;
      const res = await fetch(`${origin}/api/maintenance-status`, {
        next: { revalidate: MAINTENANCE_STATUS_CACHE_MAX_AGE },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.maintenanceMode) {
          if (isPublicPath(path)) {
            return NextResponse.next();
          }
          return NextResponse.redirect(new URL("/maintenance", request.url));
        }
      }
    } catch {
      /* allow through */
    }
  }

  if (!isDashboardPath(path)) {
    return NextResponse.next();
  }

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  const redirectPath = (role && rolePaths[role]) || "/dashboard";

  if (path === "/dashboard" || path === "/dashboard/") {
    if (role && rolePaths[role]) {
      return NextResponse.redirect(new URL(rolePaths[role], request.url));
    }
  }

  const managerCanAccessAdminPath =
    path.startsWith("/admin/withdrawals") ||
    path.startsWith("/admin/payments") ||
    path.startsWith("/admin/transactions") ||
    path.startsWith("/admin/manual-transactions") ||
    path.startsWith("/admin/applications") ||
    path.startsWith("/admin/emergency-withdrawals") ||
    path.startsWith("/admin/products") ||
    path.startsWith("/admin/settings") ||
    path.startsWith("/admin/reports") ||
    path.startsWith("/admin/revenue") ||
    path.startsWith("/admin/agent-reports") ||
    path.startsWith("/admin/user-transactions") ||
    path.startsWith("/admin/agents") ||
    path.startsWith("/admin/clients") ||
    path.startsWith("/admin/pending-transfers") ||
    path.startsWith("/admin/notifications") ||
    path.startsWith("/admin/about-team");

  if (path.startsWith("/admin") && role !== "business_admin" && !(role === "manager" && managerCanAccessAdminPath)) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }
  if (path.startsWith("/manager") && role !== "manager") {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }
  if (path.startsWith("/agent") && role !== "agent") {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }
  if (path.startsWith("/client") && role !== "client") {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
