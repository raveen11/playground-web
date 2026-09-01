import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We check for the 'access_token' cookie set by the backend
  const token = request.cookies.get("access_token")?.value;

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // If the user has a token and is trying to access a public route (like login/signup),
  // redirect them to the home page (dashboard)
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If the user doesn't have a token and is trying to access a protected route,
  // redirect them to the login page
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
