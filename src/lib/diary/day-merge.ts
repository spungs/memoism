import "server-only";
import { prisma } from "@/lib/db";
import { savePhotosByDate } from "./capture-photos";
import { appendNoteToDiary, organizeBackfillDay } from "./backfill";
import { reembedDiaryWithFragments } from "./fragment-embed";
import type { ClientExif } from "./auto-generate";
import type { MoodKey } from "./schemas";

export type DayMergeResult =
  | {
      ok: true;
      diaryId: string;
      /** 정리까지 됐는지. 안 됐으면 이유(cap·safety·empty·error)와 문구. */
      organized: boolean;
      reason?: "cap" | "safety" | "empty" | "error";
      error?: string;
    }
  | { ok: false; error: string };

/**
 * 새 일기 화면에서 "일기로 정리하기"를 눌렀는데 그날 일기가 이미 있을 때(점검 M5).
 *
 * 하루에 일기는 하나라서, 검토 화면에서 새 일기를 만들지 않고 **그날 일기에 합친 뒤
 * 그 자리에서 정리한다.** 직접 쓴 글은 본문 뒤에, 사진은 사진 뒤에 붙고, 정리는 본문 +
 * 그날 아직 정리하지 않은 조각 + 사진을 함께 엮는다(밀린 날 채우기와 같은 경로).
 * 정리 결과는 되돌리기로 합친 본문을 되찾을 수 있다.
 *
 * 정리가 막혀도(횟수 소진 등) 합친 글·사진은 남는다 — 화면이 그 일기로 보내고 이유를 알린다.
 */
export async function appendToDayAndOrganize(input: {
  userId: string;
  diaryId: string;
  dateKey: string;
  photos: File[];
  exifs: ClientExif[];
  text?: string;
  mood?: MoodKey;
  timeZone: string;
}): Promise<DayMergeResult> {
  if (input.photos.length > 0) {
    const saved = await savePhotosByDate(
      input.userId,
      input.photos,
      input.exifs,
      input.photos.map(() => input.dateKey),
    );
    if (!saved.ok) return { ok: false, error: saved.error };
  }

  // 아직 글이 없는 일기(채팅이 만든 빈 일기)의 감정은 기본값일 뿐이라 처음 쓴 글의 감정을
  // 쓴다. 이미 글이 있으면 그날 고른 감정을 덮지 않는다(createDiaryAction과 같은 규칙).
  const before = await prisma.diary.findUnique({
    where: { id: input.diaryId },
    select: { title: true, content: true, mood: true },
  });
  const firstWriting = !!before && !before.title.trim() && !before.content.trim();

  const text = input.text?.trim();
  if (text) await appendNoteToDiary(input.diaryId, text);
  if (input.mood && (firstWriting || before?.mood == null)) {
    await prisma.diary.update({
      where: { id: input.diaryId },
      data: { mood: input.mood },
    });
  }

  const r = await organizeBackfillDay(input.userId, input.dateKey, input.timeZone);
  if (r.ok) return { ok: true, diaryId: input.diaryId, organized: true };

  // 정리는 못 했어도 합친 본문이 회상에 잡히게 다시 임베딩한다.
  await reembedDiaryWithFragments(input.diaryId);
  return {
    ok: true,
    diaryId: input.diaryId,
    organized: false,
    reason: r.reason,
    error: r.error,
  };
}
