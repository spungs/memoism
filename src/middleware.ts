import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isApi = pathname.startsWith("/api/");

  const token = req.cookies.get("session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Authed user hitting an auth page → bounce to home.
  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!session && !isPublic) {
    // API routes return JSON 401 so client fetches don't follow a redirect
    // into HTML and break JSON parsing. Page routes redirect to /login.
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Forward verified session data as headers so pages skip re-verification.
  // Strip incoming x-user-* headers first to prevent external injection.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-email");
  if (session) {
    requestHeaders.set("x-user-id", session.userId);
    requestHeaders.set("x-user-email", session.email);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on every route except Next.js internals, static assets, and the PWA SW.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|workbox-.*|swe-worker-.*).*)",
  ],
};
