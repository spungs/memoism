import "server-only";
import { prisma } from "@/lib/db";
import { deleteDiaryEmbedding, upsertDiaryEmbedding } from "./embedding";

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

/** text 조각만 시간순으로 골라 prose와 합성 (임베딩 입력). 순수 함수 — reembed의 조각 선택 규약. */
export function composeEmbedTextFromFragments(
  diaryContent: string,
  fragments: { kind: string; content: string | null; createdAt: Date }[],
): string {
  const texts = fragments
    .filter((f) => f.kind === "text")
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((f) => f.content ?? "")
    .filter((s) => s.trim().length > 0);
  return composeDiaryEmbedText(diaryContent, texts);
}

/**
 * 그날 일기를 [prose + 텍스트 조각] 합성 텍스트로 재임베딩.
 *   - best-effort: 실패해도 throw 안 함 (전체를 try/catch로 감싸 흡수).
 *   - 조각이 회상 검색(findRelevantDiaries, Diary만 검색)에 잡히게 하는 핵심.
 */
export async function reembedDiaryWithFragments(
  diaryId: string,
): Promise<void> {
  try {
    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
      select: {
        title: true,
        content: true,
        fragments: { select: { kind: true, content: true, createdAt: true } },
      },
    });
    if (!diary) return;
    const embedText = composeEmbedTextFromFragments(
      diary.content,
      diary.fragments,
    );
    if (!embedText.trim()) {
      // 내용이 다 빠져나간 일기 — 그냥 두면 옛 벡터가 회상에 계속 걸려
      // 빈 껍데기를 인용하게 된다(조각을 다른 날로 옮긴 직후가 정확히 이 상황).
      await deleteDiaryEmbedding(diaryId);
      return;
    }
    await upsertDiaryEmbedding(diaryId, diary.title, embedText);
  } catch (e) {
    console.warn(
      `[reembed] failed for diary ${diaryId}:`,
      e instanceof Error ? e.message : String(e),
    );
  }
}

/**
 * 본인 일기 중 임베딩 누락분 채우기 (backfill, 개발 전용 라우트에서만 부른다).
 *
 * 조각도 합성한다 — 예전엔 본문만 임베딩해서 채팅으로만 기록한 날이 회상에서 빠졌다
 * (점검 L13). 그래서 embedding.ts가 아니라 여기 둔다(embedding.ts가 이 파일을 부르면
 * 순환 import가 된다). 내용이 전혀 없는 일기는 건너뛴다.
 */
export async function backfillUserEmbeddings(userId: string): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ diaryId: string; error: string }>;
}> {
  const missing = await prisma.diary.findMany({
    where: { userId, embedding: null },
    select: {
      id: true,
      title: true,
      content: true,
      fragments: { select: { kind: true, content: true, createdAt: true } },
    },
  });

  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ diaryId: string; error: string }> = [];
  for (const d of missing) {
    const text = composeEmbedTextFromFragments(d.content, d.fragments);
    if (!text.trim()) continue;
    const r = await upsertDiaryEmbedding(d.id, d.title, text);
    if (r.ok) {
      succeeded++;
    } else {
      failed++;
      errors.push({ diaryId: d.id, error: r.error ?? "unknown" });
    }
  }
  return { total: missing.length, succeeded, failed, errors };
}
