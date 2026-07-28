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

  it("칩 라벨은 모델용 지시문으로 바뀐다 (라벨 그대로 보내면 안 먹는다)", () => {
    const built = buildInstruction(["더 짧게"], "");
    expect(built).not.toBe("더 짧게");
    expect(built).toContain("절반");
  });

  it("칩 여러 개는 마침표로 잇는다", () => {
    const built = buildInstruction(["더 짧게", "사실 위주로"], "");
    expect(built).toContain("절반");
    expect(built).toContain("일어난 일 위주로");
    expect(built).toContain(". ");
  });

  it("자유 입력만 있으면 그대로 (앞뒤 공백 제거)", () => {
    expect(buildInstruction([], "  아침 얘기는 빼줘  ")).toBe(
      "아침 얘기는 빼줘",
    );
  });

  it("칩 + 자유 입력이면 칩이 앞", () => {
    const built = buildInstruction(["더 짧게"], "아침 얘기는 빼줘");
    expect(built.indexOf("절반")).toBeLessThan(built.indexOf("아침 얘기는"));
  });

  it("칩 전체 선택 + 자유 입력 최대치를 넣어도 잘리지 않는다", () => {
    const built = buildInstruction(
      [...AI_INSTRUCTION_PRESETS],
      "가".repeat(100),
    );
    expect(built.length).toBeLessThan(MAX_AI_INSTRUCTION_LENGTH);
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
