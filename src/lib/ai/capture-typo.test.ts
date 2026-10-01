import { describe, expect, it } from "vitest";
import { acceptTypoFix } from "./capture-typo-parse";

describe("acceptTypoFix — 오타·맞춤법·띄어쓰기 교정만 받는다", () => {
  it("오타·맞춤법을 고친 결과는 받는다", () => {
    expect(acceptTypoFix("화요일애 토마토파스타", "화요일에 토마토파스타")).toBe(
      "화요일에 토마토파스타",
    );
    expect(
      acceptTypoFix(
        "수요일에 크림파스타 만들어거 먹었어",
        "수요일에 크림파스타 만들어서 먹었어",
      ),
    ).toBe("수요일에 크림파스타 만들어서 먹었어");
  });

  it("띄어쓰기만 바꾼 결과는 받는다", () => {
    expect(acceptTypoFix("오늘점심에떡볶이먹었어", "오늘 점심에 떡볶이 먹었어")).toBe(
      "오늘 점심에 떡볶이 먹었어",
    );
  });

  it("짧은 글도 한두 글자 고친 건 받는다", () => {
    expect(acceptTypoFix("됬어", "됐어")).toBe("됐어");
  });

  it("문장을 바꿔 쓰거나 덧붙이면 원문을 지킨다", () => {
    expect(
      acceptTypoFix("오늘 떡볶이 먹었어", "오늘 점심으로 맛있는 떡볶이를 먹었다"),
    ).toBe("오늘 떡볶이 먹었어");
  });

  it("숫자가 바뀌거나 사라지면 원문을 지킨다", () => {
    expect(acceptTypoFix("3시에 만났어", "4시에 만났어")).toBe("3시에 만났어");
    expect(acceptTypoFix("커피 2잔 마셨어", "커피 두 잔 마셨어")).toBe("커피 2잔 마셨어");
  });

  it("빈 결과면 원문을 지킨다", () => {
    expect(acceptTypoFix("화요일애 갔어", "")).toBe("화요일애 갔어");
    expect(acceptTypoFix("화요일애 갔어", "   ")).toBe("화요일애 갔어");
  });

  it("결과를 감싼 따옴표와 앞뒤 공백은 벗긴다", () => {
    expect(acceptTypoFix("화요일애 갔어", '"화요일에 갔어"\n')).toBe("화요일에 갔어");
  });

  it("이모지·ㅋㅋ가 있어도 글자 수를 바르게 센다", () => {
    expect(acceptTypoFix("맛있었어ㅋㅋ 🍝 또 먹을래", "맛있었어ㅋㅋ 🍝 또 먹을래")).toBe(
      "맛있었어ㅋㅋ 🍝 또 먹을래",
    );
  });
});
