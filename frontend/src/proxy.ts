import { NextRequest, NextResponse } from "next/server";

const roleBasePath: Record<string, string> = {
  admin: "/admin",
  manager: "/manager",
  customer: "/customer",
};

const publicPaths = new Set([
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/change-registration-email",
  "/forgot-password",
  "/reset-password",
]);

const guestPaths = new Set([
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/change-registration-email",
  "/forgot-password",
  "/reset-password",
]);

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

  if (publicPaths.has(pathname)) {
    if (allowedBasePath && guestPaths.has(pathname)) {
      return NextResponse.redirect(new URL(allowedBasePath, request.url));
    }

    return NextResponse.next();
  }

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
    "/verify-email",
    "/change-registration-email",
    "/forgot-password",
    "/reset-password",
    "/admin/:path*",
    "/manager/:path*",
    "/customer/:path*",
  ],
};
