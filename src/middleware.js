import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const ROUTE_PERMISSIONS = [
  { prefix: "/dashboard", module: "dashboard" },
  { prefix: "/pos", module: "pos" },
  { prefix: "/inventory", module: "inventory" },
  { prefix: "/purchases", module: "purchases" },
  { prefix: "/customers", module: "customers" },
  { prefix: "/vendors", module: "vendors" },
  { prefix: "/accounting", module: "accounting" },
  { prefix: "/reports", module: "reports" },
  { prefix: "/users", module: "users" },
  { prefix: "/settings", module: "settings" },
  { prefix: "/admin/audit-logs", module: "users" },
  { prefix: "/admin/login-history", module: "users" },
  { prefix: "/admin/backups", module: "backups" },
];

const ROLE_HOME = {
  SUPER_ADMIN: "/dashboard",
  MANAGER: "/dashboard",
  CASHIER: "/pos",
  ACCOUNTANT: "/accounting",
  INVENTORY_STAFF: "/inventory",
};

function getRequiredModule(pathname) {
  const match = ROUTE_PERMISSIONS
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(
      (route) =>
        pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
    );

  return match?.module || null;
}

function hasPermission(token, moduleName, action = "view") {
  if (!token) return false;

  if (token.role === "SUPER_ADMIN") {
    return true;
  }

  return token.permissions?.includes(`${moduleName}:${action}`) ?? false;
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const requiredModule = getRequiredModule(pathname);

  // Routes not listed above are allowed through.
  if (!requiredModule) {
    return NextResponse.next();
  }

  // User is not authenticated.
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${req.nextUrl.search}`
    );

    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated but does not have permission.
  if (!hasPermission(token, requiredModule, "view")) {
    const roleHome = ROLE_HOME[token.role] || "/dashboard";

    // Avoid redirect loops.
    if (pathname !== roleHome) {
      return NextResponse.redirect(new URL(roleHome, req.url));
    }

    return NextResponse.redirect(new URL("/forbidden", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pos/:path*",
    "/inventory/:path*",
    "/vendors/:path*",
    "/purchases/:path*",
    "/customers/:path*",
    "/accounting/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/admin/:path*",
  ],
};
