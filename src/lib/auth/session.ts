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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    if (!user) return null;
    if (user.tokenVersion !== Number(headerTokenVersion)) return null;

    return { userId, email, tokenVersion: user.tokenVersion };
  },
);

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
