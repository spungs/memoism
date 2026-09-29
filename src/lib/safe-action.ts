import { unstable_rethrow } from "next/navigation";

export const ACTION_FAILED_MESSAGE =
  "연결이 불안정해요. 잠시 후 다시 시도해주세요.";

/**
 * 화면에서 서버 액션을 부를 때 예외까지 결과로 바꾼다.
 *
 * 서버 액션은 `{ ok: false, error }`로 실패를 알리지만, 네트워크 단절·배포 뒤 액션 ID
 * 소멸 같은 경우엔 **예외를 던진다**. 잡지 않으면 로딩 상태가 풀리지 않거나(확인
 * 시트가 닫히지 않음) 에러 바운더리가 화면을 내렸다(점검 M15). 원문은 콘솔에만 남기고
 * 화면에는 고정 문구를 준다.
 *
 * 액션이 `redirect()`하면 클라이언트 쪽 Promise는 redirect 에러로 reject된다(이동은
 * 따로 일어난다). 그걸 실패로 삼키지 않게 Next 내부 에러는 다시 던진다.
 */
export async function safeAction<T extends { ok: boolean }>(
  run: () => Promise<T>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await run();
  } catch (e) {
    unstable_rethrow(e);
    console.error("[action] failed:", e);
    return { ok: false, error: ACTION_FAILED_MESSAGE };
  }
}
