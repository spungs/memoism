import { NextResponse } from "next/server";
import { generateState, generateCodeVerifier } from "arctic";
import { getGoogleClient, GOOGLE_SCOPES, OAUTH_COOKIE } from "@/lib/auth/google";

// GET /api/auth/google?flow=auth|link
//   flow=auth : 로그인/가입 진입(로그아웃 상태)
//   flow=link : 설정에서 현재 계정에 구글 연동(로그인 상태)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const flow = url.searchParams.get("flow") === "link" ? "link" : "auth";

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const google = getGoogleClient();
  const authUrl = google.createAuthorizationURL(state, codeVerifier, [...GOOGLE_SCOPES]);
  // 구글 계정 picker를 항상 표시 — 단일 로그인 계정 자동선택을 막아 사용자가
  // 어느 계정으로 가입/로그인할지 고를 수 있게 한다(다계정·재로그인 UX).
  authUrl.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(authUrl);
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, // 구글에서 콜백으로 top-level GET 복귀 시 쿠키 전송 필요
    path: "/",
    maxAge: 60 * 10,
  };
  res.cookies.set(OAUTH_COOKIE.state, state, cookieOpts);
  res.cookies.set(OAUTH_COOKIE.verifier, codeVerifier, cookieOpts);
  res.cookies.set(OAUTH_COOKIE.flow, flow, cookieOpts);
  return res;
}
