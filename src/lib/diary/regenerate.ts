import "server-only";
import { prisma } from "@/lib/db";
import { downloadAsBase64 } from "@/lib/storage";
import { generateDiary, type DiaryGenerationOutput } from "@/lib/ai/gemini";
import { checkAndIncrement, releaseIncrement } from "@/lib/ai/usage";
import { buildExifSummary } from "./exif-summary";
import { deriveGenerationMode } from "./generation-mode";
import { pickRegeneratedTitle } from "./regenerate-input";
import { reembedDiaryWithFragments } from "./fragment-embed";
import { SafetyBlockedError } from "@/lib/ai/safety";
import { captureServer } from "@/lib/analytics/server";

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
      /** 입력이 아예 없는 경우 — AI 호출·차감 전이라 400으로 돌려준다. */
      invalidInput?: boolean;
      /** 안전 펜스에 걸림 — DB 본문은 손대지 않았다. */
      safetyBlocked?: boolean;
    };

/**
 * AI 재생성 + 백업 스왑 (NEW-7).
 *   - 일일 cap 검증·증분 (호출 전 차감)
 *   - 사진은 Storage에서 base64로 재다운로드 (재업로드 없음)
 *   - **입력 본문은 options.content(화면에서 편집 중인 현재 값)**. 클라이언트가 보내지
 *     않으면 DB 본문으로 폴백한다. 예전에는 항상 DB 본문을 읽어서, 저장하지 않고
 *     고친 내용이 무시된 채 덮어써졌다(사용자 글 유실).
 *   - mode는 source 라벨이 아니라 실제 입력(본문·사진)으로 도출한다. source로 정하면
 *     "auto_a"로 시작한 일기는 나중에 손으로 고쳐 저장한 본문까지 통째로 버렸다.
 *   - 성공 시: previousContent = *입력으로 받은 본문*, content = 새 본문,
 *     aiGenerationVersion++, contentEditedAt = now
 *     previousContent에 DB 옛 본문이 아니라 받은 본문을 넣는 이유: 되돌리기가
 *     "사용자가 보고 있던 그 글"로 복귀해야 저장 안 한 편집이 유실되지 않는다.
 */
export async function regenerateDiary(
  diaryId: string,
  userId: string,
  options: { content?: string; title?: string; instruction?: string } = {},
): Promise<RegenerateResult> {
  const diary = await prisma.diary.findFirst({
    where: { id: diaryId, userId },
    select: {
      id: true,
      title: true,
      content: true,
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

  // 화면에 보이는 현재 본문이 입력이다. 안 보내면(구 클라이언트) DB 본문으로 폴백.
  const inputContent = (options.content ?? diary.content).trim();
  // 입력이 아예 없으면 cap 검증 전에 막는다 — 사용 횟수를 차감하지 않기 위해서.
  // (사진이 실제로 내려받아지는지는 아직 모른다. 최종 mode는 다운로드 후 다시 정한다.)
  const hasAnyInput =
    deriveGenerationMode(inputContent.length > 0, diary.images.length > 0) !==
    null;
  if (!hasAnyInput) {
    return {
      ok: false,
      error: "정리할 내용이 없어요. 내용을 적거나 사진을 넣어주세요.",
      invalidInput: true,
    };
  }

  const character = await prisma.character.findUnique({
    where: { userId },
    select: { subscriptionStatus: true, plan: true },
  });
  if (!character) return { ok: false, error: "사용자 정보를 찾을 수 없습니다" };

  const cap = await checkAndIncrement(
    userId,
    character.subscriptionStatus,
    character.plan,
    "insight",
  );
  if (!cap.allowed) {
    return {
      ok: false,
      error: "오늘 AI 사용 횟수를 모두 사용했어요. 내일 다시 만나요.",
      capExhausted: true,
    };
  }

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

  // Storage에서 못 받아온 사진은 없는 것과 같다. 실제로 붙일 수 있는 사진 기준으로
  // mode를 다시 정한다 (자세한 이유는 preview-generate.ts의 같은 자리 주석 참고).
  const effectiveMode = deriveGenerationMode(
    inputContent.length > 0,
    photos.length > 0,
  );
  if (!effectiveMode) {
    // 여기까지 왔으면 캡은 이미 차감됐다 — AI는 부르지도 못했으니 돌려준다.
    await releaseIncrement(userId);
    return {
      ok: false,
      error: "사진을 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
    };
  }

  // EXIF도 사진이 실제로 붙을 때만 준다.
  const exifSummary =
    photos.length > 0
      ? buildExifSummary(
          diary.images.map((img) => ({
            takenAt: img.exifTakenAt,
            lat: img.exifLat,
            lng: img.exifLng,
          })),
        )
      : undefined;

  let draft: DiaryGenerationOutput;
  try {
    draft = await generateDiary({
      mode: effectiveMode,
      photos: photos.length > 0 ? photos : undefined,
      text: inputContent || undefined,
      persona: persona ?? undefined,
      exifSummary,
      instruction: options.instruction,
    });
  } catch (e) {
    // 펜스에 걸려도 DB 본문은 손대지 않았다 — 사용자의 글은 그대로다.
    if (e instanceof SafetyBlockedError) {
      // 원문 미저장 — 이벤트만(스펙 §7).
      void captureServer("safety_fence_triggered", userId, {
        fence: "crisis",
        path: "diary",
        stage: "model",
      });
      return { ok: false, error: e.reply, safetyBlocked: true };
    }
    // 결과를 못 줬으니 차감한 횟수를 돌려준다(펜스 차단은 제외 — usage.ts 참고).
    await releaseIncrement(userId);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "AI 생성 실패",
    };
  }

  // 백업 스왑: 입력으로 받은 본문을 previousContent로, 새 본문을 content로
  const updated = await prisma.diary.update({
    where: { id: diaryId },
    data: {
      // 사용자가 보고 있던 본문(저장 안 한 편집 포함)을 백업한다.
      // 클라이언트가 빈 값을 보냈으면 되돌릴 게 없으니 DB 본문을 유지한다.
      previousContent: options.content?.trim() || diary.content,
      previousChangedAt: new Date(),
      content: draft.content,
      // 제목도 본문과 같은 원칙: 사용자가 직접 고쳤으면 AI가 덮어쓰지 않는다.
      // (제목은 백업 컬럼이 없어 덮어쓰면 되돌리기로도 복구가 안 된다)
      title: pickRegeneratedTitle(options.title, diary.title, draft.title),
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

  // 새 본문 + 보존된 조각으로 재임베딩.
  // upsertDiaryEmbedding(본문만)을 쓰면 조각이 있는 일기를 재생성할 때마다 조각이
  // 임베딩에서 빠져 회상 검색에서 그날 조각이 사라진다. createFragment가 다시
  // 불릴 때까지 복구되지 않는다.
  await reembedDiaryWithFragments(updated.id);

  return { ok: true, diary: updated };
}
