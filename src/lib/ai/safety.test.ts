import { describe, it, expect } from "vitest";
import { prefilterMessage } from "./safety";

describe("prefilterMessage", () => {
  it("Plan 04에서는 모든 메시지를 통과시킨다(훅 포인트만 확보)", () => {
    expect(prefilterMessage("오늘 점심에 국수 먹었어")).toEqual({ blocked: false });
    expect(prefilterMessage("지난주에 뭐 했지?")).toEqual({ blocked: false });
  });

  it("빈 문자열도 통과 판정을 반환한다(호출부가 분기 없이 쓸 수 있게)", () => {
    expect(prefilterMessage("")).toEqual({ blocked: false });
  });
});
