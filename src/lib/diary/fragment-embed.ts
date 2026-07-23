import "server-only";
import { prisma } from "@/lib/db";
import { upsertDiaryEmbedding } from "./embedding";

/** 일기 본문(prose) + 텍스트 조각들을 임베딩 입력 텍스트로 합성. 순수 함수. */
export function composeDiaryEmbedText(
  content: string,
  fragmentTexts: string[],
): string {
  const parts = [content, ...fragmentTexts]
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.join("\n");
}

/**
 * 그날 일기를 [prose + 텍스트 조각] 합성 텍스트로 재임베딩.
 *   - best-effort: 실패해도 throw 안 함 (upsertDiaryEmbedding이 흡수).
 *   - 조각이 회상 검색(findRelevantDiaries, Diary만 검색)에 잡히게 하는 핵심.
 */
export async function reembedDiaryWithFragments(
  diaryId: string,
): Promise<void> {
  const diary = await prisma.diary.findUnique({
    where: { id: diaryId },
    select: {
      title: true,
      content: true,
      fragments: {
        where: { kind: "text" },
        orderBy: { createdAt: "asc" },
        select: { content: true },
      },
    },
  });
  if (!diary) return;
  const fragmentTexts = diary.fragments
    .map((f) => f.content ?? "")
    .filter((s) => s.trim().length > 0);
  const embedText = composeDiaryEmbedText(diary.content, fragmentTexts);
  if (!embedText.trim()) return;
  await upsertDiaryEmbedding(diaryId, diary.title, embedText);
}
