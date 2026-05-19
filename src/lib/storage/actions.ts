"use server";

import { getSession } from "@/lib/auth/session";
import { getSignedUrlsForOwner } from "./index";

const MAX_PATHS = 10;

export type SignedUrlsResult =
  | { ok: true; urls: (string | null)[] }
  | { ok: false; error: string };

/**
 * Diary 미리보기·검토 게이트가 storagePath들에 대한 signed URL을 받기 위한 server action.
 *   - 세션 검증
 *   - 본인 storagePath만 통과 (getSignedUrlsForOwner)
 *   - 최대 10개 path
 */
export async function getDiaryImageSignedUrls(
  storagePaths: string[],
): Promise<SignedUrlsResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Unauthorized" };

  if (!Array.isArray(storagePaths)) {
    return { ok: false, error: "잘못된 요청 형식" };
  }
  if (storagePaths.length === 0) {
    return { ok: true, urls: [] };
  }
  if (storagePaths.length > MAX_PATHS) {
    return { ok: false, error: `한 번에 최대 ${MAX_PATHS}개까지 가능합니다` };
  }
  if (!storagePaths.every((p) => typeof p === "string" && p.length > 0)) {
    return { ok: false, error: "잘못된 storage path" };
  }

  const urls = await getSignedUrlsForOwner(storagePaths, session.userId);
  return { ok: true, urls };
}
