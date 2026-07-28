import { describe, expect, it } from "vitest";
import { deriveGenerationMode } from "./generation-mode";

describe("deriveGenerationMode", () => {
  it("텍스트 + 사진이면 C (통합)", () => {
    expect(deriveGenerationMode(true, true)).toBe("C");
  });

  it("텍스트만 있으면 B (글 정리)", () => {
    expect(deriveGenerationMode(true, false)).toBe("B");
  });

  it("사진만 있으면 A", () => {
    expect(deriveGenerationMode(false, true)).toBe("A");
  });

  it("둘 다 없으면 null (호출자가 400 처리)", () => {
    expect(deriveGenerationMode(false, false)).toBeNull();
  });

  it("재정리 회귀: 사진만으로 시작했어도 텍스트가 생기면 A가 아니라 C다", () => {
    // 최초 생성은 A였지만, 사용자가 본문을 고친 뒤 재정리하면 그 본문이 입력이어야 한다.
    // 여기서 A가 나오면 사용자가 쓴 내용이 통째로 무시되는 원래 버그가 재현된다.
    expect(deriveGenerationMode(true, true)).not.toBe("A");
  });
});
