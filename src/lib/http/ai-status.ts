/**
 * AI 경로 실패 결과 → HTTP 상태. 모든 AI 라우트가 이 한 가지 기준을 쓴다(점검 L1).
 *
 * 예전엔 라우트마다 달라서 같은 모델 실패가 502·503으로 갈렸고, 안전 펜스의 정상 차단이
 * 경로에 따라 400·502·503으로 나가 로그에서 서버 장애로 집계됐다.
 *
 * - 429: 오늘 사용 횟수 소진
 * - 422: 안전 펜스 차단 — 모델이 정상 응답한 결과다. 장애가 아니다.
 * - 400: 입력 문제(정리할 재료 없음·길이 초과·공간 부족 등). 다시 불러도 같다.
 * - 503: 업스트림(Gemini) 지연·거부. 502는 "게이트웨이가 죽었다"로 읽혀 쓰지 않는다.
 *
 * 화면은 상태 숫자가 아니라 res.ok와 본문 플래그를 본다 — 이 숫자는 로그·대시보드용이다.
 */
export type AiFailure = {
  capExhausted?: boolean;
  safetyBlocked?: boolean;
  invalidInput?: boolean;
  storageFull?: boolean;
  nothingToFold?: boolean;
};

export function aiFailureStatus(r: AiFailure): number {
  if (r.capExhausted) return 429;
  if (r.safetyBlocked) return 422;
  if (r.invalidInput || r.storageFull || r.nothingToFold) return 400;
  return 503;
}
