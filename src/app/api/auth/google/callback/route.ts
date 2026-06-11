import { NextResponse } from "next/server";
import * as arctic from "arctic";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession, signSession, buildSessionCookie } from "@/lib/auth/session";
import {
  getGoogleClient,
  OAUTH_COOKIE,
  signGooglePending,
  PENDING_COOKIE_MAX_AGE,
} from "@/lib/auth/google";

interface IdTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
}

function redirectClearing(origin: string, path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, origin));
  res.cookies.delete(OAUTH_COOKIE.state);
  res.cookies.delete(OAUTH_COOKIE.verifier);
  res.cookies.delete(OAUTH_COOKIE.flow);
  return res;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");

  const jar = await cookies();
  const storedState = jar.get(OAUTH_COOKIE.state)?.value ?? null;
  const codeVerifier = jar.get(OAUTH_COOKIE.verifier)?.value ?? null;
  const flow = jar.get(OAUTH_COOKIE.flow)?.value === "link" ? "link" : "auth";

  const failDest = flow === "link" ? "/settings?google=error" : "/login?error=google";

  // 1) state/CSRF 검증
  if (!code || !stateParam || !storedState || !codeVerifier || stateParam !== storedState) {
    return redirectClearing(origin, failDest);
  }

  // 2) code 교환 + idToken 디코드
  let claims: IdTokenClaims;
  try {
    const google = getGoogleClient();
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    claims = arctic.decodeIdToken(tokens.idToken()) as IdTokenClaims;
  } catch {
    return redirectClearing(origin, failDest);
  }

  const googleSub = claims.sub;
  const email = claims.email?.toLowerCase();
  const emailVerified = claims.email_verified === true;
  // email을 정체성 키로 쓰므로 미검증 구글 이메일은 거부.
  if (!googleSub || !email || !emailVerified) {
    return redirectClearing(origin, failDest);
  }

  // ===== LINK 플로우: 로그인된 현재 계정에 googleSub 부착 =====
  if (flow === "link") {
    const session = await getSession();
    if (!session) return redirectClearing(origin, "/login");

    const owner = await prisma.user.findUnique({
      where: { googleSub },
      select: { id: true },
    });
    if (owner && owner.id !== session.userId) {
      // 이미 다른 계정에 연결된 구글 계정 — 탈취 방지.
      return redirectClearing(origin, "/settings?google=taken");
    }
    if (owner && owner.id === session.userId) {
      return redirectClearing(origin, "/settings?google=linked");
    }
    await prisma.user.update({
      where: { id: session.userId },
      data: { googleSub },
    });
    return redirectClearing(origin, "/settings?google=linked");
  }

  // ===== AUTH 플로우: 로그인 또는 가입 =====
  // (a) googleSub 매칭 → 로그인
  const byGoogle = await prisma.user.findUnique({
    where: { googleSub },
    select: { id: true, email: true, tokenVersion: true },
  });
  if (byGoogle) {
    const token = await signSession({
      userId: byGoogle.id,
      email: byGoogle.email,
      tokenVersion: byGoogle.tokenVersion,
    });
    const res = redirectClearing(origin, "/");
    const { name, value, options } = buildSessionCookie(token);
    res.cookies.set(name, value, options);
    return res;
  }

  // (b) 같은 email의 비밀번호 계정 존재 → 자동 연동 금지, "로그인 후 연동" 유도
  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (byEmail) {
    return redirectClearing(origin, "/login?error=email_exists");
  }

  // (c) 브랜드-신규 → 동의 인터스티셜로. 계정 생성은 동의 후에만.
  const pending = await signGooglePending({ googleSub, email });
  const res = redirectClearing(origin, "/signup/consent");
  res.cookies.set(OAUTH_COOKIE.pending, pending, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_COOKIE_MAX_AGE,
  });
  return res;
}
