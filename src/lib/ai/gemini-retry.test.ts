import { describe, expect, it, vi } from "vitest";
import { callWithRetry, isTransient, GeminiError, GeminiTimeoutError } from "./gemini";

/**
 * 재시도 분류 회귀 방지.
 *
 * 2026-09-22 사진 9장 일기의 재정리가 20초 타임아웃 → 502로 죽었다. 원인은 느린
 * 사진이 아니라 **타임아웃만 재시도 대상에서 빠져 있던 것**이었다. 같은 입력이
 * 7.1s~14.0s로 흔들리는데(실측), 상한을 한 번 넘겼다고 즉시 포기하고 있었다.
 */
describe("isTransient", () => {
  it("타임아웃은 일시적 장애로 본다 — 재시도 가치가 있다", () => {
    expect(isTransient(new GeminiTimeoutError("Gemini 응답 시간이 초과되었습니다"))).toBe(
      true,
    );
  });

  it("503·429는 기존대로 일시적", () => {
    expect(isTransient(new Error("503 UNAVAILABLE: model overloaded"))).toBe(true);
    expect(isTransient(new Error("429 RESOURCE_EXHAUSTED"))).toBe(true);
  });

  it("결제 크레딧 소진은 재시도해도 소용없다", () => {
    expect(
      isTransient(new Error("429 Your prepayment credits are depleted.")),
    ).toBe(false);
  });

  it("스키마·파싱 오류는 재시도 대상이 아니다", () => {
    expect(isTransient(new GeminiError("Gemini 응답이 비어 있습니다"))).toBe(false);
  });
});

describe("callWithRetry", () => {
  it("타임아웃은 딱 한 번만 더 시도한다 — 상한을 두 번 넘게 기다리지 않는다", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new GeminiTimeoutError("Gemini 응답 시간이 초과되었습니다"));
    await expect(callWithRetry(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("타임아웃 뒤 두 번째가 성공하면 그 값을 돌려준다", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new GeminiTimeoutError("초과"))
      .mockResolvedValue("ok");
    await expect(callWithRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("503은 기본 횟수(3회)를 그대로 쓴다 — 즉시 실패라 기다림이 짧다", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("503 UNAVAILABLE"));
    await expect(callWithRetry(fn, 2)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("일시적이지 않은 실패는 한 번만 시도한다", async () => {
    const fn = vi.fn().mockRejectedValue(new GeminiError("응답이 비어 있습니다"));
    await expect(callWithRetry(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
