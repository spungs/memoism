import { Google } from "arctic";
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

// 서버 전용 모듈. 라우트 핸들러/서버 액션에서만 import.
// (jwt.ts와 달리 미들웨어가 import하지 않으므로 Prisma/Node API 사용 가능.)

// openid+email만 요청 — 이름/아바타는 저장하지 않는다(설계 결정).
export const GOOGLE_SCOPES = ["openid", "email"] as const;

export const OAUTH_COOKIE = {
  state: "google_oauth_state",
  verifier: "google_oauth_verifier",
  flow: "google_oauth_flow",
  pending: "google_signup_pending",
} as const;

export type GoogleFlow = "auth" | "link";

export function getGoogleClient(): Google {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectURI = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectURI) {
    throw new Error(
      "Google OAuth env가 비었습니다. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI 확인.",
    );
  }
  return new Google(clientId, clientSecret, redirectURI);
}

// ---- 동의 인터스티셜용 pending 토큰 (검증된 구글 신원을 10분간 단명 보관) ----
const PENDING_TTL_SECONDS = 60 * 10;

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set.");
  return new TextEncoder().encode(s);
}

export interface GooglePending {
  googleSub: string;
  email: string;
}

export async function signGooglePending(p: GooglePending): Promise<string> {
  return new SignJWT({ googleSub: p.googleSub, email: p.email, purpose: "google_signup" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyGooglePending(token: string): Promise<GooglePending | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "google_signup") return null;
    if (typeof payload.googleSub !== "string" || typeof payload.email !== "string") return null;
    return { googleSub: payload.googleSub, email: payload.email };
  } catch {
    return null;
  }
}

export const PENDING_COOKIE_MAX_AGE = PENDING_TTL_SECONDS;
