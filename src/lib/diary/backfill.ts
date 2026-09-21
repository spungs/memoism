import "server-only";
import { prisma } from "@/lib/db";
import { savePhotosByDate } from "./capture-photos";
import { organizeDiaryFromFragments } from "./organize";
import { regenerateDiary } from "./regenerate";
import { kstDayRangeFromKey } from "./kst";
import { backfillLimitsFor, type BackfillLimits } from "./backfill-group";
import { effectiveTier } from "@/lib/ai/usage";
import type { ClientExif } from "./auto-generate";

/**
 * 이 사용자가 한 번에 채울 수 있는 양. 화면과 서버 검증이 **같은 값**을 봐야
 * "30장까지"라고 써놓고 서버가 60장을 받는 어긋남이 안 생긴다.
 *
 * 티어는 서버가 직접 조회한다 — 클라이언트가 보낸 요금제를 믿으면 한도가
 * 무의미해진다.
 */
export async function getBackfillLimits(userId: string): Promise<BackfillLimits> {
  const c = await prisma.character.findUnique({
    where: { userId },
    select: { subscriptionStatus: true, plan: true },
  });
  if (!c) return backfillLimitsFor("FREE");
  return backfillLimitsFor(effectiveTier(c.subscriptionStatus, c.plan));
}

/**
 * ① 사진을 날짜별로 저장한다. **먼저 이것부터 끝낸다.**
 *
 * 생성이 하나라도 실패했다고 업로드를 되돌리면 사용자가 파일 선택을 처음부터
 * 다시 해야 한다. 사진은 그 자체로 기록이므로 저장은 독립적으로 완결시킨다.
 *
 * 쿼터 검증·orderIndex 이어붙이기·보상 삭제는 `savePhotosByDate`가 이미 한다.
 */
export async function saveBackfillPhotos(
  userId: string,
  photos: File[],
  exifs: ClientExif[],
  dateKeys: string[],
): Promise<{ ok: true; savedDates: string[] } | { ok: false; error: string }> {
  if (photos.length === 0) return { ok: false, error: "사진이 없어요" };
  if (exifs.length !== photos.length || dateKeys.length !== photos.length) {
    return { ok: false, error: "사진과 메타데이터 개수가 맞지 않아요" };
  }

  const { maxPhotos, maxDays } = await getBackfillLimits(userId);
  if (photos.length > maxPhotos) {
    return { ok: false, error: `한 번에 ${maxPhotos}장까지 올릴 수 있어요` };
  }
  if (new Set(dateKeys).size > maxDays) {
    return { ok: false, error: `한 번에 ${maxDays}일까지 채울 수 있어요` };
  }

  const saved = await savePhotosByDate(userId, photos, exifs, dateKeys);
  if (!saved.ok) return { ok: false, error: saved.error };
  return {
    ok: true,
    savedDates: [...new Set(saved.entries.map((e) => e.dateKey))],
  };
}

/**
 * ② 한 날짜의 본문을 만든다. 클라이언트가 날짜를 순회하며 부른다(스펙 §9).
 *
 * 그날 일기에 **미반영 조각이 있으면** `organizeDiaryFromFragments`가 조각까지 엮고,
 * 없으면 `regenerateDiary`가 사진(+기존 본문)으로 만든다. 둘 다 기존 본문을
 * 보존하는 규약을 이미 갖고 있어 **덮어쓰기가 일어나지 않는다**(스펙 §4.2).
 *
 * 캡·안전 펜스도 그 두 함수가 이미 처리한다 — 여기서 다시 부르지 않는다
 * (회피 경로를 만들지 않기 위해).
 */
export async function organizeBackfillDay(
  userId: string,
  dateKey: string,
): Promise<
  | { ok: true; diaryId: string; title: string }
  | { ok: false; reason: "cap" | "safety" | "empty" | "error"; error: string }
> {
  const { startUtc, endUtc } = kstDayRangeFromKey(dateKey);
  const diary = await prisma.diary.findFirst({
    where: { userId, createdAt: { gte: startUtc, lt: endUtc } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      _count: { select: { images: true } },
      fragments: {
        where: { kind: "text", foldedAt: null },
        select: { id: true },
      },
    },
  });
  if (!diary) return { ok: false, reason: "empty", error: "그 날 일기가 없어요" };
  if (diary._count.images === 0 && diary.fragments.length === 0) {
    return { ok: false, reason: "empty", error: "정리할 재료가 없어요" };
  }

  // 미반영 조각이 있으면 organize가 조각까지 엮는다. 없으면 사진 기반 재생성.
  const r =
    diary.fragments.length > 0
      ? await organizeDiaryFromFragments(diary.id, userId)
      : await regenerateDiary(diary.id, userId);

  if (r.ok) return { ok: true, diaryId: r.diary.id, title: r.diary.title };
  if (r.capExhausted) return { ok: false, reason: "cap", error: r.error };
  if (r.safetyBlocked) return { ok: false, reason: "safety", error: r.error };
  return { ok: false, reason: "error", error: r.error };
}
