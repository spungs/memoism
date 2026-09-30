import { ACTION_FAILED_MESSAGE } from "@/lib/safe-action";

/** 연결 자체가 끊겼을 때(fetch가 던짐) 보여줄 문구. 서버 액션 실패와 같은 문장이다. */
export const NETWORK_ERROR_MESSAGE = ACTION_FAILED_MESSAGE;

/**
 * 응답 본문을 JSON으로 읽는다. 본문이 JSON이 아니면 null — 예외로 새지 않게 한다(점검 M8).
 *
 * 플랫폼이 끊은 요청(413·502·504)은 본문이 HTML이라 `res.json()`이 먼저 터지고, catch가
 * "Unexpected end of JSON input" 같은 영어 원문을 화면에 띄웠다. 반환 타입은 `res.json()`과
 * 같다(호출부가 기존처럼 필드를 읽도록).
 */
export async function readJson(
  res: Response,
): Promise<Awaited<ReturnType<Response["json"]>> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * 실패 응답을 화면에 띄울 한국어 문구로 바꾼다. 서버가 준 `error`가 있으면 그것을,
 * 없으면(HTML 오류 페이지 등) 상태 코드로 고르고, 그래도 없으면 `fallback`을 쓴다.
 */
export function responseErrorMessage(
  res: Response,
  data: unknown,
  fallback: string,
): string {
  const err = (data as { error?: unknown } | null)?.error;
  if (typeof err === "string" && err.trim()) return err;
  if (res.status === 413) return "사진 용량이 한 번에 보내기엔 커요. 장수를 줄여서 다시 해주세요.";
  if (res.status === 401) return "로그인이 만료됐어요. 다시 로그인해주세요.";
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return "응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.";
  }
  return fallback;
}
