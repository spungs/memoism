import "server-only";
import { cookies } from "next/headers";
import { normalizeTimeZone, TZ_COOKIE } from "./tz";

/**
 * 요청을 보낸 기기의 시간대(쿠키 `tz`, 루트 레이아웃의 인라인 스크립트가 심는다).
 * 없거나 잘못되면 서울 — 쿠키가 생기기 전 첫 요청도 예전과 같게 동작한다.
 *
 * 라우트·페이지·서버 액션에서 읽어 라이브러리 함수에 **인자로** 넘긴다.
 * 라이브러리가 직접 읽지 않아야 시간대별 단위 테스트가 가능하다.
 */
export async function getRequestTimeZone(): Promise<string> {
  const store = await cookies();
  const raw = store.get(TZ_COOKIE)?.value;
  // 스크립트가 encodeURIComponent로 심는다("America%2FNew_York"). 이미 풀린 값은
  // 다시 풀어도 그대로다.
  let decoded: string | undefined;
  try {
    decoded = raw ? decodeURIComponent(raw) : undefined;
  } catch {
    decoded = undefined;
  }
  return normalizeTimeZone(decoded);
}
