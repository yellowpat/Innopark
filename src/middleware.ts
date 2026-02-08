import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Public routes
  if (pathname === "/login" || pathname === "/register") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // API auth routes are always accessible
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Impersonate API is always accessible for logged-in admins
  if (pathname.startsWith("/api/impersonate")) {
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // For admins, check the impersonate cookie to determine effective role
  let effectiveRole = role;
  if (role === "ADMIN") {
    const impersonate = req.cookies.get("innopark-impersonate-role")?.value;
    if (impersonate === "CENTER_STAFF" || impersonate === "PARTICIPANT") {
      effectiveRole = impersonate;
    }
  }

  // Admin routes - require ADMIN or CENTER_STAFF effective role
  if (pathname.startsWith("/admin")) {
    if (effectiveRole !== "ADMIN" && effectiveRole !== "CENTER_STAFF") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
