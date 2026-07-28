import { describe, expect, it } from "vitest";
import {
  buildInstruction,
  AI_INSTRUCTION_PRESETS,
  MAX_AI_INSTRUCTION_LENGTH,
} from "./ai-instruction";

describe("buildInstruction", () => {
  it("아무것도 없으면 빈 문자열 (지시 없이 기존 동작)", () => {
    expect(buildInstruction([], "")).toBe("");
    expect(buildInstruction([], "   ")).toBe("");
  });

  it("칩만 선택하면 쉼표로 잇는다", () => {
    expect(buildInstruction(["더 짧게", "사실 위주로"], "")).toBe(
      "더 짧게, 사실 위주로",
    );
  });

  it("자유 입력만 있으면 그대로 (앞뒤 공백 제거)", () => {
    expect(buildInstruction([], "  아침 얘기는 빼줘  ")).toBe(
      "아침 얘기는 빼줘",
    );
  });

  it("칩 + 자유 입력이면 칩이 앞", () => {
    expect(buildInstruction(["더 짧게"], "아침 얘기는 빼줘")).toBe(
      "더 짧게, 아침 얘기는 빼줘",
    );
  });

  it("상한을 넘지 않는다", () => {
    const long = "가".repeat(500);
    expect(buildInstruction([], long).length).toBe(MAX_AI_INSTRUCTION_LENGTH);
  });

  it("프리셋은 5개이고 중복이 없다", () => {
    expect(AI_INSTRUCTION_PRESETS).toHaveLength(5);
    expect(new Set(AI_INSTRUCTION_PRESETS).size).toBe(5);
  });
});
