import { describe, expect, it } from "vitest";
import { parseDateSplit } from "./capture-split-parse";

const MSG = "화요일에 토마토파스타, 수요일에 크림파스타 만들어서 먹었어";
const CANDS = [
  { dateKey: "2026-09-29", label: "화요일" },
  { dateKey: "2026-09-30", label: "수요일" },
];

describe("parseDateSplit — 모델이 나눈 결과를 그대로 믿지 않는다", () => {
  it("원문을 그대로 잘라낸 조각이면 받는다", () => {
    const raw = JSON.stringify([
      { date: "2026-09-29", text: "화요일에 토마토파스타" },
      { date: "2026-09-30", text: "수요일에 크림파스타 만들어서 먹었어" },
    ]);
    expect(parseDateSplit(MSG, CANDS, raw)).toEqual([
      { dateKey: "2026-09-29", text: "화요일에 토마토파스타" },
      { dateKey: "2026-09-30", text: "수요일에 크림파스타 만들어서 먹었어" },
    ]);
  });

  it("코드 블록으로 감싸도 읽는다", () => {
    const raw = "```json\n" + JSON.stringify([
      { date: "2026-09-29", text: "화요일에 토마토파스타," },
      { date: "2026-09-30", text: "수요일에 크림파스타 만들어서 먹었어" },
    ]) + "\n```";
    expect(parseDateSplit(MSG, CANDS, raw)?.length).toBe(2);
  });

  it("원문에 없는 말(바꿔 쓴 문장)이 있으면 버린다", () => {
    const raw = JSON.stringify([
      { date: "2026-09-29", text: "화요일에 토마토파스타를 만들어 먹었어" },
      { date: "2026-09-30", text: "수요일에 크림파스타 만들어서 먹었어" },
    ]);
    expect(parseDateSplit(MSG, CANDS, raw)).toBeNull();
  });

  it("후보에 없는 날짜면 버린다", () => {
    const raw = JSON.stringify([{ date: "2026-09-28", text: "화요일에 토마토파스타" }]);
    expect(parseDateSplit(MSG, CANDS, raw)).toBeNull();
  });

  it("원문의 상당 부분이 빠지면 버린다(글이 조용히 사라지지 않게)", () => {
    const raw = JSON.stringify([{ date: "2026-09-29", text: "토마토파스타" }]);
    expect(parseDateSplit(MSG, CANDS, raw)).toBeNull();
  });

  it("빈 배열·JSON 아님·형식 틀림은 버린다", () => {
    expect(parseDateSplit(MSG, CANDS, "[]")).toBeNull();
    expect(parseDateSplit(MSG, CANDS, "모르겠어")).toBeNull();
    expect(parseDateSplit(MSG, CANDS, JSON.stringify([{ date: "2026-09-29" }]))).toBeNull();
  });

  it("같은 부분이 두 날에 해당하면 둘 다 받는다", () => {
    const msg = "어제랑 오늘 둘 다 비가 왔어";
    const cands = [
      { dateKey: "2026-09-30", label: "어제" },
      { dateKey: "2026-10-01", label: "오늘" },
    ];
    const raw = JSON.stringify([
      { date: "2026-09-30", text: "어제랑 오늘 둘 다 비가 왔어" },
      { date: "2026-10-01", text: "어제랑 오늘 둘 다 비가 왔어" },
    ]);
    expect(parseDateSplit(msg, cands, raw)?.map((s) => s.dateKey)).toEqual(["2026-09-30", "2026-10-01"]);
  });

  it("한 날짜를 여러 토막으로 주면 원문의 이어진 구간 하나로 합친다(날짜 단어만 남지 않게)", () => {
    const msg = "어제랑 오늘 둘 다 비가 왔어";
    const cands = [
      { dateKey: "2026-09-30", label: "어제" },
      { dateKey: "2026-10-01", label: "오늘" },
    ];
    const raw = JSON.stringify([
      { date: "2026-09-30", text: "어제" },
      { date: "2026-09-30", text: "비가 왔어" },
      { date: "2026-10-01", text: "오늘" },
      { date: "2026-10-01", text: "비가 왔어" },
    ]);
    expect(parseDateSplit(msg, cands, raw)).toEqual([
      { dateKey: "2026-09-30", text: "어제랑 오늘 둘 다 비가 왔어" },
      { dateKey: "2026-10-01", text: "오늘 둘 다 비가 왔어" },
    ]);
  });
});

