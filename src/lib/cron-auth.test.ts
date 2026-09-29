import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedCron } from "./cron-auth";

describe("isAuthorizedCron", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("시크릿이 맞으면 통과", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCron("Bearer s3cret")).toBe(true);
  });

  it("시크릿이 틀리거나 헤더가 없으면 거절", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCron("Bearer s3creX")).toBe(false);
    expect(isAuthorizedCron("Bearer s3cret-longer")).toBe(false);
    expect(isAuthorizedCron(null)).toBe(false);
  });

  it('시크릿이 설정되지 않은 배포에서는 "Bearer undefined"도 거절 (점검 H7)', () => {
    // 예전 비교식은 `Bearer ${process.env.CRON_SECRET}`라 기준값이 "Bearer undefined"가
    // 되어, 그 문자열을 보내면 통과했다.
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCron("Bearer undefined")).toBe(false);
    expect(isAuthorizedCron("Bearer ")).toBe(false);
  });
});
