import "server-only";
import { prisma } from "@/lib/db";
import { downloadAsBase64 } from "@/lib/storage";
import {
  generateDiary,
  type DiaryGenerationMode,
  type DiaryGenerationOutput,
} from "@/lib/ai/gemini";
import { checkAndIncrement } from "@/lib/ai/usage";
import { buildExifSummary } from "./exif-summary";
import { upsertDiaryEmbedding } from "./embedding";

// 일기당 재생성 cap은 제거됨 (사용자 결정). 일일 cap이 비용·abuse 차단.
// aiGenerationVersion 컬럼은 통계·로깅용으로만 카운트.

export type RegenerateResult =
  | {
      ok: true;
      diary: {
        id: string;
        title: string;
        content: string;
        previousContent: string | null;
        aiGenerationVersion: number;
      };
    }
  | {
      ok: false;
      error: string;
      capExhausted?: boolean; // 일일 cap
    };

function modeFor(source: string, photoCount: number): DiaryGenerationMode {
  if (source === "auto_a") return "A";
  if (source === "auto_b") return "B";
  if (source === "auto_c") return "C";
  // manual 일기: 사진 있으면 C(통합), 없으면 B(텍스트 정리)
  return photoCount > 0 ? "C" : "B";
}

/**
 * AI 재생성 + 백업 스왑 (NEW-7).
 *   - 일기당 cap 5회 검증 → 도달 시 429
 *   - 일일 cap 검증·증분 (호출 전 차감)
 *   - 사진은 Storage에서 base64로 재다운로드 (재업로드 없음)
 *   - 사용자가 손으로 수정한 현재 content를 *입력 텍스트*로 다시 보냄
 *     (mode A는 사진만이라 text 미전달)
 *   - 성공 시: previousContent = 직전 content, content = 새 본문,
 *     aiGenerationVersion++, contentEditedAt = now
 */
export async function regenerateDiary(
  diaryId: string,
  userId: string,
): Promise<RegenerateResult> {
  const diary = await prisma.diary.findFirst({
    where: { id: diaryId, userId },
    select: {
      id: true,
      title: true,
      content: true,
      source: true,
      aiGenerationVersion: true,
      images: {
        select: {
          storagePath: true,
          exifTakenAt: true,
          exifLat: true,
          exifLng: true,
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
  if (!diary) return { ok: false, error: "일기를 찾을 수 없습니다" };

  const character = await prisma.character.findUnique({
    where: { userId },
    select: { subscriptionStatus: true, plan: true },
  });
  if (!character) return { ok: false, error: "사용자 정보를 찾을 수 없습니다" };

  const cap = await checkAndIncrement(userId, character.subscriptionStatus, character.plan);
  if (!cap.allowed) {
    return {
      ok: false,
      error: "오늘 AI 사용 횟수를 모두 사용했어요. 내일 다시 만나요.",
      capExhausted: true,
    };
  }

  const mode = modeFor(diary.source, diary.images.length);

  // 사진들을 base64로 재다운로드
  const photoResults = await Promise.all(
    diary.images.map((img) => downloadAsBase64(img.storagePath)),
  );
  const photos = photoResults.filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  // 페르소나 (가입 시 자동 생성됨)
  const persona = await prisma.userPersona.findUnique({
    where: { userId },
    select: {
      presetKey: true,
      tone: true,
      formality: true,
      sentenceLength: true,
    },
  });

  const exifSummary = buildExifSummary(
    diary.images.map((img) => ({
      takenAt: img.exifTakenAt,
      lat: img.exifLat,
      lng: img.exifLng,
    })),
  );
  const text = mode === "A" ? undefined : diary.content;

  let draft: DiaryGenerationOutput;
  try {
    draft = await generateDiary({
      mode,
      photos: photos.length > 0 ? photos : undefined,
      text,
      persona: persona ?? undefined,
      exifSummary,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "AI 생성 실패",
    };
  }

  // 백업 스왑: 현재 content를 previousContent로, 새 본문을 content로
  const updated = await prisma.diary.update({
    where: { id: diaryId },
    data: {
      previousContent: diary.content,
      previousChangedAt: new Date(),
      content: draft.content,
      title: draft.title,
      aiGenerationVersion: { increment: 1 },
      contentEditedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      content: true,
      previousContent: true,
      aiGenerationVersion: true,
    },
  });

  // 새 본문으로 재임베딩
  await upsertDiaryEmbedding(updated.id, updated.title, updated.content);

  return { ok: true, diary: updated };
}
