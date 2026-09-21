import { describe, expect, it } from "vitest";
import { enforceVerifiedHotline } from "./hotline-guard";
import { CRISIS_REPLY } from "./safety";

const run = (s: string) => enforceVerifiedHotline(s, CRISIS_REPLY);

describe("교체해야 하는 것 — 모델이 지어낸 번호", () => {
  it("실측에서 실제로 나온 답변 (1393 포함)", () => {
    const r = run("자살예방 상담전화는 1393번이야. 그 외에도 129, 1388도 있어.");
    expect(r.replaced).toBe(true);
    expect(r.text).toBe(CRISIS_REPLY);
  });

  it("맞는 번호를 말해도 교체한다 — 출처가 모델이면 신뢰하지 않는다", () => {
    const r = run("정신건강 위기상담전화 1577-0199로 연락해봐.");
    expect(r.replaced).toBe(true);
  });

  it("하이픈 없는 표기도 잡는다", () => {
    expect(run("상담은 15770199 로 전화해").replaced).toBe(true);
  });
});

describe("교체하면 안 되는 것 — 일상 표현", () => {
  it("숫자만 있고 상담 맥락이 없으면 그대로 둔다", () => {
    expect(run("109층 전망대에 다녀왔구나! 멋졌겠다.").replaced).toBe(false);
    expect(run("129번 버스 타고 갔어?").replaced).toBe(false);
  });

  it("상담 얘기지만 번호가 없으면 그대로 둔다", () => {
    expect(run("많이 힘들면 상담을 받아보는 것도 방법이야.").replaced).toBe(false);
  });

  it("평범한 대화는 건드리지 않는다", () => {
    const s = "어제 저녁으로 파스타 먹었구나, 맛있었겠다!";
    expect(run(s)).toEqual({ text: s, replaced: false });
  });
});

describe("이미 검증된 문구", () => {
  it("그대로 둔다 (무한 교체 방지)", () => {
    expect(run(CRISIS_REPLY)).toEqual({ text: CRISIS_REPLY, replaced: false });
  });
});
