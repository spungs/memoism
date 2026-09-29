import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose/jwt/sign";
import { signSession, verifySessionToken } from "./jwt";
import { signGooglePending, verifyGooglePending } from "./google";

const SECRET = "test-secret-for-jwt-purpose-0123456789";

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

const sign = (payload: Record<string, unknown>) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(SECRET));

describe("세션 토큰과 구글 가입 대기 토큰 분리 (점검 L4)", () => {
  it("세션 토큰은 세션으로 통과한다", async () => {
    const t = await signSession({ userId: "u1", email: "a@b.c", tokenVersion: 0 });
    const s = await verifySessionToken(t);
    expect(s?.userId).toBe("u1");
    expect(s?.purpose).toBe("session");
  });

  it("purpose가 없는 예전 세션 토큰도 받는다 — 배포로 모두 로그아웃되지 않게", async () => {
    const t = await sign({ userId: "u1", email: "a@b.c", tokenVersion: 0 });
    expect((await verifySessionToken(t))?.userId).toBe("u1");
  });

  it("구글 가입 대기 토큰은 세션으로 통과하지 못한다", async () => {
    const t = await signGooglePending({ googleSub: "g1", email: "a@b.c" });
    expect(await verifySessionToken(t)).toBeNull();
  });

  it("세션 토큰은 가입 대기 토큰으로 통과하지 못한다", async () => {
    const t = await signSession({ userId: "u1", email: "a@b.c", tokenVersion: 0 });
    expect(await verifyGooglePending(t)).toBeNull();
  });

  it("모양이 다른 페이로드는 거절한다", async () => {
    expect(await verifySessionToken(await sign({ userId: "u1", email: "a@b.c" }))).toBeNull();
    expect(await verifySessionToken(await sign({ userId: 1, email: "a@b.c", tokenVersion: 0 }))).toBeNull();
  });
});
