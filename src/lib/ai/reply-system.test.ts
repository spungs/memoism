import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * 프롬프트 규칙 회귀 방지.
 *
 * 펜스가 안 걸리는 경로(2단 false·fail-open·기록 경로)에서는 모델이 그대로 답한다.
 * 그때 상담 번호를 지어내면 틀린 번호가 나간다 — 실제로 그런 적이 있다.
 * 프롬프트에서 번호 언급을 금지하는 문장이 사라지지 않게 잡아둔다.
 */
const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("번호 지어내기 금지 규칙", () => {
  it("채팅 시스템 프롬프트에 남아 있다", () => {
    const s = read("src/app/api/chat/route.ts");
    expect(s).toContain("전화번호는 절대 만들어내지 않기");
    expect(s).toContain("시스템이 따로 처리한다");
  });

  it("캡처 응답 프롬프트에 남아 있다", () => {
    const s = read("src/lib/ai/capture.ts");
    expect(s).toContain("상담전화·긴급전화 번호를 절대 말하지 마라");
  });
});

describe("전문 영역 회피 규칙", () => {
  it("채팅 시스템 프롬프트에 남아 있다", () => {
    const s = read("src/app/api/chat/route.ts");
    expect(s).toContain("전문 영역은 넘기지 않기");
  });

  it("캡처 응답 프롬프트에 남아 있다", () => {
    const s = read("src/lib/ai/capture.ts");
    expect(s).toContain("의료·법률·금융 판단 금지");
  });
});
