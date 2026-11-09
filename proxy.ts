/**
 * Purpose: Next.js 16 Proxy (formerly middleware) that gates (app) routes.
 * Inputs: incoming request + Auth.js session cookie.
 * Outputs: redirect to /login, or next().
 *
 * WHY a separate NextAuth(authConfig) instance: this file must stay free of
 * postgres.js. JWT decode is enough for an optimistic redirect. Layouts still
 * call `auth()` from `@/auth` as the real check. PayPal webhooks stay public.
 */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/vault",
  "/freeze-shield",
  "/money",
  "/copilot",
  "/settings",
  "/onboarding",
];

/**
 * Redirect unauthenticated visitors away from protected pages.
 */
export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (needsAuth && !request.auth) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/projects",
    "/projects/:path*",
    "/vault",
    "/vault/:path*",
    "/freeze-shield",
    "/freeze-shield/:path*",
    "/money",
    "/money/:path*",
    "/copilot",
    "/copilot/:path*",
    "/settings",
    "/settings/:path*",
    "/onboarding",
    "/onboarding/:path*",
  ],
};
