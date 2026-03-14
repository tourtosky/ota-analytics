import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/api/dashboard");
  const isLoginPage = pathname === "/login";
  const isAdminLogin = pathname === "/admin/login";

  // Public routes — no auth needed
  if (!isAdminRoute && !isDashboardRoute && !isLoginPage) {
    return NextResponse.next();
  }

  // Login pages are accessible without auth
  if (isLoginPage || isAdminLogin) {
    return NextResponse.next();
  }

  const { user, response } = await updateSession(request);

  if (!user) {
    // API routes get 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Pages redirect to login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/dashboard/:path*", "/api/dashboard/:path*", "/login"],
};
