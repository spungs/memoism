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

export async function createSession(
  userId: string,
  email: string,
  tokenVersion: number,
): Promise<void> {
  const token = await signSession({ userId, email, tokenVersion });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
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
