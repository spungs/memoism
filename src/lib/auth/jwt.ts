import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import type { JWTPayload } from "jose";

// Edge-safe JWT helpers. NEVER import Prisma (or anything that pulls it in)
// here: this module is imported by src/middleware.ts which runs on the Edge
// runtime, where Prisma is unavailable. DB-backed session validation lives in
// session.ts (Node/server-only).

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload extends JWTPayload {
  userId: string;
  email: string;
  tokenVersion: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to .env.local.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: {
  userId: string;
  email: string;
  tokenVersion: number;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

export { SESSION_DURATION_SECONDS };
