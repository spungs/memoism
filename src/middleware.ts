import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const token = req.cookies.get("session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Authed user hitting an auth page → bounce to home.
  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Unauthed user hitting a protected page → bounce to login (preserve target).
  if (!session && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except Next.js internals, static assets, and the PWA SW.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|workbox-.*|swe-worker-.*).*)",
  ],
};
