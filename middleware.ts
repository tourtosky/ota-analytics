import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/admin");
  const isAdminPage = pathname.startsWith("/admin");

  if (!isApiRoute && !isAdminPage) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    // No secret configured — block all admin access
    if (isApiRoute) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Check for key in query param (initial login)
  const keyParam = request.nextUrl.searchParams.get("key");
  if (keyParam === secret) {
    // Set cookie and redirect to clean URL (without key in query string)
    const cleanUrl = new URL(request.url);
    cleanUrl.searchParams.delete("key");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set("admin_token", secret, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  // Check cookie
  const cookie = request.cookies.get("admin_token")?.value;
  if (cookie === secret) {
    return NextResponse.next();
  }

  // Not authenticated
  if (isApiRoute) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
