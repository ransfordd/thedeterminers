import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const rolePaths: Record<string, string> = {
  business_admin: "/admin",
  manager: "/manager",
  agent: "/agent",
  client: "/client",
};

export default withAuth(
  function proxyHandler(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = token?.role as string | undefined;

    // Redirect root dashboard to role-specific dashboard
    if (path === "/dashboard" || path === "/dashboard/") {
      if (role && rolePaths[role]) {
        return NextResponse.redirect(new URL(rolePaths[role], req.url));
      }
    }

    // Role-based route protection
    const redirectPath = (role && rolePaths[role]) || "/dashboard";
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
      path.startsWith("/admin/notifications");
    if (path.startsWith("/admin") && role !== "business_admin" && !(role === "manager" && managerCanAccessAdminPath)) {
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }
    if (path.startsWith("/manager") && role !== "manager") {
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }
    if (path.startsWith("/agent") && role !== "agent") {
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }
    if (path.startsWith("/client") && role !== "client") {
      return NextResponse.redirect(new URL(redirectPath, req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/manager",
    "/manager/:path*",
    "/agent",
    "/agent/:path*",
    "/client",
    "/client/:path*",
  ],
};
