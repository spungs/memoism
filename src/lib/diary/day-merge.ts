import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { savePhotosByDate } from "./capture-photos";
import { appendNoteToDiary } from "./backfill";
import { reembedDiaryWithFragments } from "./fragment-embed";
import type { ClientExif } from "./auto-generate";
import type { MoodKey } from "./schemas";

/**
 * 새 일기 화면에서 "일기로 정리하기"를 눌렀는데 그날 일기가 이미 있을 때(점검 M5).
 *
 * 하루에 일기는 하나라서, 검토 화면에서 새 일기를 만들지 않고 **그날 일기에 합친다.**
 * 직접 쓴 글은 본문 뒤에, 사진은 사진 뒤에 붙는다. 정리는 여기서 하지 않고 화면이 이어서
 * 따로 부른다(`/api/diaries/backfill/organize`, 같은 날 같은 일기를 고른다).
 *
 * 합치기와 정리를 한 요청에 묶었더니, 정리를 기다리다 "취소"하면 서버는 이미 합쳤는데
 * 화면엔 초안이 남아 다시 누를 때 사진이 두 번 들어갔다. 나누면 합치기가 끝나는 즉시
 * 화면이 초안을 지우므로, 정리 도중 취소·오류가 나도 같은 글·사진이 다시 가지 않는다.
 */
export async function appendToDay(input: {
  userId: string;
  diaryId: string;
  dateKey: string;
  photos: File[];
  exifs: ClientExif[];
  text?: string;
  mood?: MoodKey;
}): Promise<{ ok: true; diaryId: string } | { ok: false; error: string }> {
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

  // 정리를 못 하게 되더라도(취소·횟수 소진) 합친 본문이 회상에 잡히게 다시 임베딩한다.
  // 응답 뒤에 한다 — 임베딩(모델 호출)까지 기다리면 합치기는 끝났는데 화면이 모르는 구간이
  // 길어져, 그 사이 취소·재시도로 같은 사진이 또 합쳐질 틈이 커진다.
  after(() => reembedDiaryWithFragments(input.diaryId));
  return { ok: true, diaryId: input.diaryId };
}
