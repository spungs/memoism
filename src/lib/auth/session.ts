import { cache } from "react";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  signSession,
  verifySessionToken,
  SESSION_DURATION_SECONDS,
  type SessionPayload,
} from "./jwt";

const SESSION_COOKIE = "session";

// Re-export the Edge-safe jose helpers so existing import sites keep working.
export { signSession, verifySessionToken };
export type { SessionPayload };

const SESSION_COOKIE_OPTS = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

// 라우트 핸들러에서 응답 객체에 직접 세션 쿠키를 부착할 때 재사용.
// (NextResponse.redirect를 반환하는 핸들러에서는 cookies().set() 대신 이걸 써야 안정적.)
export function buildSessionCookie(token: string) {
  return { name: SESSION_COOKIE, value: token, options: SESSION_COOKIE_OPTS };
}

export async function createSession(
  userId: string,
  email: string,
  tokenVersion: number,
): Promise<void> {
  const token = await signSession({ userId, email, tokenVersion });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTS);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * tokenVersion 검증 결과의 짧은 캐시 (함수 인스턴스 로컬).
 *
 * 이 검증 하나 때문에 **모든 페이지·API가 요청마다 users를 한 번 조회**했다. DB가
 * 싱가포르에 있어 그 왕복이 그대로 첫 화면 지연이 된다(실측 2026-09-23: 응답이
 * 0KB인 API도 859ms).
 *
 * tokenVersion이 올라가는 건 **비밀번호 변경뿐이다**(`auth/actions.ts`). 몇 달에 한 번
 * 있을까 한 일을 위해 매 요청 왕복을 치르는 건 값이 맞지 않는다. 대신 그 창을 30초로
 * 줄여 두고, 비밀번호를 바꾼 인스턴스에서는 즉시 버린다
 * (`invalidateTokenVersionCache`).
 *
 * 남는 위험: 다른 인스턴스가 캐시를 들고 있으면 최대 30초 동안 옛 세션이 통과한다.
 * 비밀번호 변경 직후 30초를 노린 탈취를 막지는 못하지만, 그 시나리오는 공격자가 이미
 * 유효한 쿠키를 들고 있다는 뜻이라 이 검증의 주 목적(기기 정리)과는 층이 다르다.
 * 즉시성이 필요해지면 TTL을 0으로 두면 옛 동작 그대로다.
 */
const TOKEN_VERSION_TTL_MS = 30_000;
const tokenVersionCache = new Map<string, { version: number; expiresAt: number }>();

/** 비밀번호 변경처럼 tokenVersion을 올린 직후 호출한다. */
export function invalidateTokenVersionCache(userId: string): void {
  tokenVersionCache.delete(userId);
}

// Reads the session forwarded by middleware (x-user-* headers) and then
// validates it against the DB: a session whose tokenVersion no longer matches
// the user's current tokenVersion is treated as invalidated (e.g. after a
// password change on another device — QA M-10). cache() dedupes the DB read
// across multiple getSession() calls within a single request.
export const getSession = cache(
  async (): Promise<SessionPayload | null> => {
    const headerStore = await headers();
    const userId = headerStore.get("x-user-id");
    const email = headerStore.get("x-user-email");
    const headerTokenVersion = headerStore.get("x-user-token-version");
    if (!userId || !email) return null;

    const now = Date.now();
    const cached = tokenVersionCache.get(userId);
    let currentVersion: number;

    if (cached && cached.expiresAt > now) {
      currentVersion = cached.version;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tokenVersion: true },
      });
      // 없는 사용자는 캐싱하지 않는다 — 탈퇴·삭제 직후 상태를 붙들 이유가 없다.
      if (!user) return null;
      currentVersion = user.tokenVersion;
      tokenVersionCache.set(userId, {
        version: currentVersion,
        expiresAt: now + TOKEN_VERSION_TTL_MS,
      });
    }

    if (currentVersion !== Number(headerTokenVersion)) return null;

    return { userId, email, tokenVersion: currentVersion };
  },
);

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
