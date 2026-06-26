import { NextRequest, NextResponse } from "next/server";

const roleBasePath: Record<string, string> = {
  admin: "/admin",
  manager: "/manager",
  customer: "/customer",
};

function getRequestedBasePath(
  pathname: string,
): "/admin" | "/manager" | "/customer" | null {
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/manager")) return "/manager";
  if (pathname.startsWith("/customer")) return "/customer";
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("auth_role")?.value;
  const allowedBasePath = role ? roleBasePath[role] : undefined;

  // Landing page and auth pages — always accessible.
  // Client-side AuthContext handles session validation and redirects.
  // This avoids redirect loops caused by stale auth_role cookies.
  if (pathname === "/") {
    return NextResponse.next();
  }

  const isPublicAuthPath =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (isPublicAuthPath) {
    return NextResponse.next();
  }

  // Protected routes — redirect to landing if no auth_role cookie
  const requestedBasePath = getRequestedBasePath(pathname);

  if (!requestedBasePath) {
    return NextResponse.next();
  }

  if (!role) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!allowedBasePath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (requestedBasePath !== allowedBasePath) {
    return NextResponse.redirect(new URL(allowedBasePath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/admin/:path*",
    "/manager/:path*",
    "/customer/:path*",
  ],
};
