import "server-only";
import { prisma } from "@/lib/db";
import { savePhotosByDate } from "./capture-photos";
import { reembedDiaryWithFragments } from "./fragment-embed";
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
 *
 * `notes`(날짜별 메모)는 같은 요청에서 그날 일기 **본문**에 쓴다. 일반 작성 화면에서
 * 글+사진으로 정리하는 것과 같은 모양이 되도록 — ②의 정리가 이 본문과 사진으로
 * 일기를 만들고, 원래 메모는 previousContent로 남아 되돌릴 수 있다. 사진과 한
 * 요청에 묶는 이유: 메모를 따로 먼저 보냈더니 그 사이 앱이 재시작되면서 사진 없이
 * 메모만 남았다(2026-09-28 운영). 정리 전에 끊겨도 사진+메모 일기는 남는다.
 */
export async function saveBackfillPhotos(
  userId: string,
  photos: File[],
  exifs: ClientExif[],
  dateKeys: string[],
  notes: Record<string, string> = {},
): Promise<
  | {
      ok: true;
      savedDates: string[];
      diaryIds: Record<string, string>;
      /** 사진은 저장됐지만 메모를 붙이지 못한 날짜. 화면이 알려준다. */
      noteFailed: string[];
    }
  | { ok: false; error: string }
> {
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
  // 메모는 사진 트랜잭션 밖이다. 여기서 던지면 사진은 저장됐는데 500이 나가, 화면이
  // 실패로 알고 다시 보내 사진이 중복됐다 — 날짜별로 잡아서 알려준다(점검 M7).
  const noteFailed: string[] = [];
  for (const e of saved.entries) {
    const note = notes[e.dateKey]?.trim();
    if (!note) continue;
    try {
      // 메모가 본문에 들어가면 회상이 찾을 수 있게 다시 임베딩한다(best-effort).
      if (await appendNoteToDiary(e.diaryId, note)) {
        await reembedDiaryWithFragments(e.diaryId);
      }
    } catch (err) {
      console.error(
        "[backfill] note append failed:",
        err instanceof Error ? err.message : err,
      );
      noteFailed.push(e.dateKey);
    }
  }
  return {
    ok: true,
    savedDates: [...new Set(saved.entries.map((e) => e.dateKey))],
    // 결과 화면이 날짜를 그날 일기로 잇는 데 쓴다. 정리가 한도에 걸려 organize를
    // 부르지 못한 날도 사진은 여기서 이미 일기에 들어가 있다.
    diaryIds: Object.fromEntries(saved.entries.map((e) => [e.dateKey, e.diaryId])),
    noteFailed,
  };
}

/**
 * 메모를 일기 본문에 붙인다. 본문이 비어 있으면 메모가 곧 본문이다.
 *
 * 이미 들어 있으면 건너뛴다 — 한 날짜 사진이 여러 요청으로 나뉘면 요청마다 같은
 * 메모가 오고, 업로드가 끊겨 처음부터 다시 누를 때도 같은 메모가 다시 온다.
 * 그날 일기에 이미 쓴 글이 있으면 덮지 않고 뒤에 잇는다. 본문을 바꿨으면 true.
 */
async function appendNoteToDiary(diaryId: string, note: string): Promise<boolean> {
  const diary = await prisma.diary.findUnique({
    where: { id: diaryId },
    select: { content: true },
  });
  if (!diary) return false;
  const current = diary.content.trim();
  if (current.includes(note)) return false;
  await prisma.diary.update({
    where: { id: diaryId },
    data: {
      content: current ? `${current}\n\n${note}` : note,
      contentEditedAt: new Date(),
    },
  });
  return true;
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
  timeZone: string,
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
      ? await organizeDiaryFromFragments(diary.id, userId, timeZone)
      : await regenerateDiary(diary.id, userId, timeZone);

  if (r.ok) return { ok: true, diaryId: r.diary.id, title: r.diary.title };
  if (r.capExhausted) return { ok: false, reason: "cap", error: r.error };
  if (r.safetyBlocked) return { ok: false, reason: "safety", error: r.error };
  return { ok: false, reason: "error", error: r.error };
}
