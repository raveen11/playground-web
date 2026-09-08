import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = ["/login", "/signup", "/lobby"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We check for the 'access_token' cookie set by the backend
  const token = request.cookies.get("access_token")?.value;

  if (pathname.startsWith("/lobby")) {
    return NextResponse.next();
  }

  const isAuthOnlyRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");

  // If the user has a token and is trying to access login/signup, redirect to home
  if (token && isAuthOnlyRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If the user doesn't have a token and is trying to access a protected route,
  // redirect them to the login page
  if (!token && !isAuthOnlyRoute) {
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
