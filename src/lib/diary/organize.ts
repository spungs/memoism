import "server-only";
import { prisma } from "@/lib/db";
import { downloadAsBase64 } from "@/lib/storage";
import { generateDiary, type DiaryGenerationOutput } from "@/lib/ai/gemini";
import { checkAndIncrement } from "@/lib/ai/usage";
import { buildExifSummary } from "./exif-summary";
import { deriveGenerationMode } from "./generation-mode";
import { reembedDiaryWithFragments } from "./fragment-embed";
import { MAX_AI_INPUT_CONTENT_LENGTH } from "./schemas";
import { dateKeyLabel, kstDateKey } from "./kst";
import { SafetyBlockedError } from "@/lib/ai/safety";
import {
  selectFragmentsForFold,
  toPromptFragments,
  type FoldCandidate,
} from "./fragment-fold";

export type OrganizeResult =
  | {
      ok: true;
      diary: {
        id: string;
        title: string;
        content: string;
        previousContent: string | null;
        aiGenerationVersion: number;
      };
      foldedCount: number;
      skippedCount: number;
      /** 그 일기의 KST 날짜 키. 결과 칩 문구·링크에 쓴다. */
      dateKey: string;
      /** "8월 3일". 호출자가 kst를 다시 임포트하지 않게 함께 돌려준다. */
      label: string;
      /**
       * 그 일기의 실제 작성 시각(ISO). 결과 칩이 **정리한 시각이 아니라 일기의 날짜**를
       * 보여줘야 한다 — 8월 3일 일기를 오늘 정리하면 칩에 "9월 22일"이 찍혀서
       * 눌렀을 때 나오는 일기와 날짜가 어긋난다.
       */
      diaryCreatedAt: string;
    }
  | {
      ok: false;
      error: string;
      capExhausted?: boolean;
      /** 미반영 텍스트 조각이 0건 — AI 호출·차감 전에 돌려준다. */
      nothingToFold?: boolean;
      /** 안전 펜스에 걸림 — 저장된 조각·본문은 그대로다. AI 생성만 건너뛴다. */
      safetyBlocked?: boolean;
    };

/**
 * 미반영 조각을 일기 본문으로 정리한다.
 *
 * `regenerateDiary`와 형제 함수로 두는 이유: regenerate의 계약은 "화면에서 편집 중인
 * 본문(options.content)이 입력"이고 그 계약에 매달린 규약이 많다(백업 스왑이 *받은*
 * 본문을 저장하는 이유, 모드를 source가 아닌 실제 입력으로 도출하는 이유). 조각 합류는
 * **입력 출처가 다른 별개 동작**이라, 한 함수에 두 계약을 섞으면 options.content 유무에
 * 따라 함수 의미가 갈라지고 두 호출자가 서로의 주석을 읽어야 한다.
 *
 * 공유하는 것: cap("insight"), 사진 base64 재다운로드, deriveGenerationMode,
 * previousContent 스왑 규약, 재임베딩.
 */
export async function organizeDiaryFromFragments(
  diaryId: string,
  userId: string,
  options: { instruction?: string } = {},
): Promise<OrganizeResult> {
  const diary = await prisma.diary.findFirst({
    where: { id: diaryId, userId },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      images: {
        select: {
          storagePath: true,
          exifTakenAt: true,
          exifLat: true,
          exifLng: true,
        },
        orderBy: { orderIndex: "asc" },
      },
      fragments: {
        where: { kind: "text", foldedAt: null },
        select: { id: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!diary) return { ok: false, error: "일기를 찾을 수 없습니다" };

  const candidates: FoldCandidate[] = diary.fragments
    .filter((f) => (f.content ?? "").trim().length > 0)
    .map((f) => ({
      id: f.id,
      content: f.content ?? "",
      createdAt: f.createdAt,
    }));

  if (candidates.length === 0) {
    return { ok: false, error: "정리할 새 조각이 없어요.", nothingToFold: true };
  }

  const currentContent = diary.content.trim();
  const { selected, skippedCount } = selectFragmentsForFold(
    candidates,
    currentContent.length,
    MAX_AI_INPUT_CONTENT_LENGTH,
  );

  if (selected.length === 0) {
    // 본문이 이미 상한을 다 먹었다. AI를 부르면 조각은 못 넣고 돈만 쓴다.
    return {
      ok: false,
      error: `일기가 너무 길어서 조각을 더 넣을 수 없어요. ${MAX_AI_INPUT_CONTENT_LENGTH}자 이내로 줄여주세요.`,
      nothingToFold: true,
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

  // 조각도 텍스트 입력이다 — 조각만 있고 사진이 없으면 B, 사진까지 있으면 C.
  // (selected.length > 0이 위에서 보장되므로 hasText는 항상 true)
  const mode = deriveGenerationMode(true, photos.length > 0);
  if (!mode) return { ok: false, error: "정리할 내용이 없어요." };

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
      mode,
      photos: photos.length > 0 ? photos : undefined,
      text: currentContent || undefined,
      fragments: toPromptFragments(selected),
      persona: persona ?? undefined,
      exifSummary,
      instruction: options.instruction,
    });
  } catch (e) {
    // 펜스에 걸린 것은 실패가 아니다 — 조각은 그대로 남고 AI 생성만 건너뛴다.
    // foldedAt도 안 찍히므로 나중에 다시 정리할 수 있다.
    if (e instanceof SafetyBlockedError) {
      return { ok: false, error: e.reply, safetyBlocked: true };
    }
    // 실패 시 foldedAt은 찍히지 않는다 — 다음에 다시 시도할 수 있다.
    return { ok: false, error: e instanceof Error ? e.message : "AI 생성 실패" };
  }

  const foldedAt = new Date();
  const selectedIds = selected.map((f) => f.id);

  // 본문 스왑과 foldedAt 마킹은 한 트랜잭션이다. 부분 성공으로 foldedAt만 찍히면
  // 그 조각들은 영영 반영되지 않고, 사용자에겐 되돌릴 방법이 없다.
  const [updated] = await prisma.$transaction([
    prisma.diary.update({
      where: { id: diaryId },
      data: {
        // 되돌리기는 "사용자가 보고 있던 그 글"로 복귀해야 한다. 채팅 전용 날은
        // 빈 문자열이고 그게 맞다 — 조각 타임라인은 그대로 남는다.
        previousContent: diary.content,
        previousChangedAt: foldedAt,
        content: draft.content,
        // 제목이 비어 있던 채팅 컨테이너면 AI 제목을 받는다. 사용자가 붙인 제목이
        // 있으면 건드리지 않는다 — 제목엔 백업 컬럼이 없어 덮어쓰면 되돌리기로도
        // 복구가 안 된다.
        title: diary.title.trim() ? diary.title : draft.title,
        aiGenerationVersion: { increment: 1 },
        contentEditedAt: foldedAt,
      },
      select: {
        id: true,
        title: true,
        content: true,
        previousContent: true,
        aiGenerationVersion: true,
      },
    }),
    prisma.diaryFragment.updateMany({
      where: { id: { in: selectedIds } },
      data: { foldedAt },
    }),
  ]);

  // 조각은 정리 후에도 보존되므로 임베딩 입력에 계속 있어야 한다.
  await reembedDiaryWithFragments(updated.id);

  const dateKey = kstDateKey(diary.createdAt);
  return {
    ok: true,
    diary: updated,
    foldedCount: selected.length,
    skippedCount,
    dateKey,
    label: dateKeyLabel(dateKey),
    diaryCreatedAt: diary.createdAt.toISOString(),
  };
}
