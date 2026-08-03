"use server";

import { getSession } from "@/lib/auth/session";
import { setPhotoVisionOptIn } from "./vision-consent";

type Result = { ok: true } | { ok: false; error: string };

/**
 * 사진을 메이에게 보여줄지에 대한 동의를 기록한다.
 *
 * 동의 시트(최초 1회)와 설정 토글이 같은 액션을 쓴다 — 두 곳에서 각자 저장하면
 * "설정에서 껐는데 시트가 또 뜨는" 상태가 생긴다.
 */
export async function setPhotoVisionConsentAction(
  value: boolean,
): Promise<Result> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };
  if (typeof value !== "boolean") {
    return { ok: false, error: "잘못된 요청" };
  }
  await setPhotoVisionOptIn(session.userId, value);
  return { ok: true };
}
