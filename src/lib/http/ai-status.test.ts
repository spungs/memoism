import { describe, expect, it } from "vitest";
import { aiFailureStatus } from "./ai-status";

describe("aiFailureStatus (점검 L1)", () => {
  it("한 가지 기준으로 상태를 고른다", () => {
    expect(aiFailureStatus({ capExhausted: true })).toBe(429);
    expect(aiFailureStatus({ safetyBlocked: true })).toBe(422);
    expect(aiFailureStatus({ invalidInput: true })).toBe(400);
    expect(aiFailureStatus({ storageFull: true })).toBe(400);
    expect(aiFailureStatus({ nothingToFold: true })).toBe(400);
    expect(aiFailureStatus({})).toBe(503);
  });
  it("횟수 소진이 가장 먼저다", () => {
    expect(aiFailureStatus({ capExhausted: true, safetyBlocked: true })).toBe(429);
  });
});
