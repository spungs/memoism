import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, signSession, SESSION_DURATION_SECONDS } from "@/lib/auth/jwt";

// 슬라이딩 세션: 남은 유효기간이 전체의 절반(15일) 이하이면 쿠키를 재발급한다.
// Edge 런타임에서 실행되므로 jose(Edge-safe)만 사용 — DB 접근 없음.
const SESSION_REFRESH_THRESHOLD = SESSION_DURATION_SECONDS / 2;

const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

// Exact-match whitelist. Adding a sub-route under /login or /signup later requires
// updating this list explicitly — preferred over prefix matching to avoid auth
// bypass via unintended sub-routes (QA L-1).
const PUBLIC_PATHS = new Set(["/login", "/signup", "/signup/consent"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);
  const isApi = pathname.startsWith("/api/");

  // Vercel Cron 등 비대화형 엔드포인트는 세션 쿠키가 없다. /api/cron/* 는
  // 미들웨어 인증을 우회하고 라우트 자체의 CRON_SECRET 검증에 맡긴다.
  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;
  const session = token ? await verifySessionToken(token) : null;

  // OAuth 엔드포인트: 로그아웃 상태(로그인/가입)와 로그인 상태(설정 연동) 둘 다에서
  // 도달 가능해야 한다. 절대 게이트하지 않고, 세션이 있으면 x-user-* 헤더를 포워딩해
  // 콜백에서 getSession()이 동작하도록 한다(link 플로우).
  if (pathname.startsWith("/api/auth/")) {
    const h = new Headers(req.headers);
    h.delete("x-user-id");
    h.delete("x-user-email");
    h.delete("x-user-token-version");
    if (session) {
      h.set("x-user-id", session.userId);
      h.set("x-user-email", session.email);
      h.set("x-user-token-version", String(session.tokenVersion));
    }
    return NextResponse.next({ request: { headers: h } });
  }

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
  requestHeaders.delete("x-user-token-version");
  if (session) {
    requestHeaders.set("x-user-id", session.userId);
    requestHeaders.set("x-user-email", session.email);
    requestHeaders.set("x-user-token-version", String(session.tokenVersion));
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // 슬라이딩 세션: 남은 유효기간 < 15일이면 쿠키를 재발급해 30일을 다시 부여.
  // exp가 없거나 이미 만료된 경우(session이 null)엔 이 분기에 도달하지 않는다.
  if (session?.exp) {
    const nowSec = Math.floor(Date.now() / 1000);
    const remainSec = session.exp - nowSec;
    if (remainSec > 0 && remainSec < SESSION_REFRESH_THRESHOLD) {
      try {
        const newToken = await signSession({
          userId: session.userId,
          email: session.email,
          tokenVersion: session.tokenVersion,
        });
        response.cookies.set("session", newToken, SESSION_COOKIE_OPTS);
      } catch {
        // 재발급 실패 시 기존 쿠키로 계속 진행 (로그아웃 없음)
      }
    }
  }

  return response;
}

export const config = {
  // Run on every route except Next.js internals, static assets, and the PWA SW.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|workbox-.*|swe-worker-.*|worker-.*).*)",
  ],
};
