import { describe, expect, it } from "vitest";
import { hasCrisisKeyword } from "./crisis-keywords";

describe("hasCrisisKeyword — 잡아야 하는 것 (재현율 우선)", () => {
  it("자해·자살 직접 표현", () => {
    expect(hasCrisisKeyword("죽고 싶다")).toBe(true);
    expect(hasCrisisKeyword("자살하고 싶어")).toBe(true);
    expect(hasCrisisKeyword("자해했어")).toBe(true);
  });

  it("완곡어·소멸 욕구", () => {
    expect(hasCrisisKeyword("그냥 사라지고 싶어")).toBe(true);
    expect(hasCrisisKeyword("없어지고 싶다")).toBe(true);
    expect(hasCrisisKeyword("태어나지 말았어야 했어")).toBe(true);
  });

  it("작별·유서 성격", () => {
    expect(hasCrisisKeyword("유서를 썼어")).toBe(true);
    expect(hasCrisisKeyword("마지막 인사를 하려고")).toBe(true);
  });

  it("띄어쓰기가 달라도 잡는다", () => {
    expect(hasCrisisKeyword("죽고싶다")).toBe(true);
    expect(hasCrisisKeyword("자 살 하고 싶어")).toBe(true);
  });

  it("문장 가운데 있어도 잡는다", () => {
    expect(hasCrisisKeyword("오늘 너무 힘들어서 죽고 싶었어 진짜로")).toBe(true);
  });
});

describe("hasCrisisKeyword — 1단은 과거형을 거르지 않는다 (2단의 일)", () => {
  it("과거 회상도 1단에서는 통과시키지 않는다 — 넘겨서 2단이 판단한다", () => {
    // 재현율 우선 설계. 여기서 false가 되면 2단이 볼 기회조차 없다.
    expect(hasCrisisKeyword("그땐 죽고 싶었지만 지금은 괜찮아")).toBe(true);
  });
});

describe("hasCrisisKeyword — 잡으면 안 되는 것", () => {
  it("평범한 일상", () => {
    expect(hasCrisisKeyword("오늘 점심에 국수 먹었어")).toBe(false);
    expect(hasCrisisKeyword("지난주에 뭐 했지?")).toBe(false);
  });

  it("관용 표현", () => {
    expect(hasCrisisKeyword("배고파 죽겠다")).toBe(false);
    expect(hasCrisisKeyword("더워 죽겠어")).toBe(false);
    expect(hasCrisisKeyword("웃겨 죽는 줄 알았네")).toBe(false);
  });

  it("빈 문자열·공백", () => {
    expect(hasCrisisKeyword("")).toBe(false);
    expect(hasCrisisKeyword("   ")).toBe(false);
  });
});
