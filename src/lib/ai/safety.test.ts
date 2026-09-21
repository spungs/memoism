import { describe, expect, it, vi, beforeEach } from "vitest";

// 2단 판정을 모듈째 대체한다. 거부 프로미스를 쓰지 않으므로(null로 실패를 표현)
// vitest가 미처리 거부로 오인해 테스트를 깨뜨리는 일이 없다.
vi.mock("./crisis-confirm", () => ({ confirmCrisis: vi.fn() }));

import { confirmCrisis } from "./crisis-confirm";
import { screenUserText, CRISIS_REPLY } from "./safety";

const confirmMock = vi.mocked(confirmCrisis);

beforeEach(() => confirmMock.mockReset());

describe("screenUserText", () => {
  it("키워드에 안 걸리면 2단을 부르지 않는다", async () => {
    const r = await screenUserText("오늘 점심에 국수 먹었어");
    expect(r).toEqual({ blocked: false });
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("2단이 true면 차단하고 검증된 번호를 준다", async () => {
    confirmMock.mockResolvedValue(true);
    const r = await screenUserText("죽고 싶다");
    expect(r.blocked).toBe(true);
    if (!r.blocked) return;
    expect(r.kind).toBe("crisis");
    expect(r.stage).toBe("model");
    expect(r.reply).toBe(CRISIS_REPLY);
    expect(r.reply).toContain("109");
    expect(r.reply).toContain("1577-0199");
  });

  it("2단이 false면 통과 — 과거 회상 오탐 방지", async () => {
    confirmMock.mockResolvedValue(false);
    const r = await screenUserText("그땐 죽고 싶었지만 지금은 괜찮아");
    expect(r).toEqual({ blocked: false });
    expect(confirmMock).toHaveBeenCalledOnce();
  });

  it("2단이 null(판정 불능)이면 통과시킨다 — fail-open", async () => {
    confirmMock.mockResolvedValue(null);
    const r = await screenUserText("죽고 싶다");
    expect(r).toEqual({ blocked: false });
    expect(confirmMock).toHaveBeenCalledOnce();
  });

  it("빈 문자열은 2단 없이 통과", async () => {
    const r = await screenUserText("");
    expect(r).toEqual({ blocked: false });
    expect(confirmMock).not.toHaveBeenCalled();
  });
});

describe("CRISIS_REPLY", () => {
  it("상담사 흉내를 내지 않는다 — 진단·단정 표현이 없다", () => {
    expect(CRISIS_REPLY).not.toContain("괜찮아질");
    expect(CRISIS_REPLY).not.toContain("우울증");
  });

  // 2026-09-22 보건복지부 보건복지상담센터 확인. 바꾸려면 출처를 먼저 다시 확인할 것.
  it("검증된 번호만 담는다", () => {
    expect(CRISIS_REPLY).toContain("109");
    expect(CRISIS_REPLY).toContain("1577-0199");
  });

  it("담당이 다른 번호는 넣지 않는다", () => {
    // 펜스가 죽어 있던 동안 모델이 실제로 지어냈던 번호들.
    // 129=보건복지상담센터(일반), 1388=청소년, 1366=여성 — 자살예방 전용이 아니다.
    expect(CRISIS_REPLY).not.toContain("129");
    expect(CRISIS_REPLY).not.toContain("1388");
    expect(CRISIS_REPLY).not.toContain("1366");
    expect(CRISIS_REPLY).not.toContain("1393"); // 2024-01-01 109로 통합됨
  });

  it("운영시간과 요금을 알린다 — 망설임을 줄인다", () => {
    expect(CRISIS_REPLY).toContain("24시간");
    expect(CRISIS_REPLY).toContain("무료");
  });
});
