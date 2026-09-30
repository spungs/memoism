import { NextResponse } from "next/server";

/**
 * 라우트 핸들러를 감싸, 처리하지 못한 예외도 `{ error }` JSON + 500으로 돌려준다(점검 M8).
 *
 * 감싸지 않으면 Next가 본문 없는(HTML) 500을 내보내, 화면의 `res.json()`이 먼저 터지고
 * "Unexpected end of JSON input" 같은 영어 문장이 빨간 글씨로 떴다. 원문은 로그에만 남긴다.
 */
export function withJsonErrors<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("[api] unhandled:", e instanceof Error ? e.stack ?? e.message : e);
      return NextResponse.json(
        { error: "잠시 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
        { status: 500 },
      );
    }
  };
}
