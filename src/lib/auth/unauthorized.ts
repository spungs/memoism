import { NextResponse } from "next/server";

/**
 * 로그인이 없거나 만료된 요청에 돌려주는 문구. 화면이 `error`를 그대로 띄우므로
 * 한국어로 둔다 — 영어 "Unauthorized"가 빨간 글씨로 떴다(점검 M21).
 *
 * 흔한 경로: 다른 기기에서 비밀번호를 바꾸면 이 기기 토큰은 서명이 맞아 미들웨어를
 * 통과하지만 getSession이 tokenVersion 불일치로 null을 준다. 보호된 페이지는 세션이
 * 없으면 /login으로 보내니, 다음 이동에서 로그인 화면으로 간다.
 */
export const UNAUTHORIZED_MESSAGE = "로그인이 만료됐어요. 다시 로그인해주세요.";

export function unauthorized() {
  return NextResponse.json({ error: UNAUTHORIZED_MESSAGE }, { status: 401 });
}
