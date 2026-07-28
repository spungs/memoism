import "server-only";
import { prisma } from "@/lib/db";
import { downloadAsBase64 } from "@/lib/storage";
import { generateDiary, type DiaryGenerationOutput } from "@/lib/ai/gemini";
import { checkAndIncrement } from "@/lib/ai/usage";
import { buildExifSummary } from "./exif-summary";
import { deriveGenerationMode } from "./generation-mode";
import type { ClientExif } from "./auto-generate";

// 저장 전 검토 게이트의 "다시 생성"용 (DB 저장 X).
// auto-generate와 달리 사진은 *이미 Storage에 업로드돼 있어* storagePath로 재다운로드한다.
// 일일 cap만 적용 (per-item cap은 정책상 제거됨, regenerate.ts 주석 참고).
//
// mode는 클라이언트가 보내지 않는다 — 최초 mode를 믿으면(사진만 첨부 시 A) 사용자가
// 검토화면에서 고친 본문이 통째로 버려진다. 실제 입력으로 서버가 도출한다.

export type PreviewGenerateInput = {
  userId: string;
  storagePaths: string[];
  exifs: ClientExif[];
  /** 검토화면 textarea의 *현재* 값. 최초 입력이 아니다. */
  text?: string;
  /** 재정리 방향 지시문 (선택). */
  instruction?: string;
};

export type PreviewGenerateResult =
  | { ok: true; data: DiaryGenerationOutput }
  | {
      ok: false;
      error: string;
      capExhausted?: boolean;
      /** 입력이 아예 없는 경우 — AI 호출·차감 전이라 400으로 돌려준다. */
      invalidInput?: boolean;
    };

export async function previewGenerateDiary(
  input: PreviewGenerateInput,
): Promise<PreviewGenerateResult> {
  // mode 도출을 cap 검증보다 먼저 한다 — 입력이 없으면 사용 횟수를 차감하지 않는다.
  const trimmedText = input.text?.trim();
  const mode = deriveGenerationMode(
    !!trimmedText,
    input.storagePaths.length > 0,
  );
  if (!mode) {
    return {
      ok: false,
      error: "정리할 내용이 없어요. 사진을 넣거나 내용을 적어주세요.",
      invalidInput: true,
    };
  }

  const character = await prisma.character.findUnique({
    where: { userId: input.userId },
    select: { subscriptionStatus: true, plan: true },
  });
  if (!character) {
    return { ok: false, error: "사용자 정보를 찾을 수 없습니다" };
  }

  // 일일 cap 검증·증분 (호출 전 차감)
  const cap = await checkAndIncrement(input.userId, character.subscriptionStatus, character.plan);
  if (!cap.allowed) {
    return {
      ok: false,
      error: "오늘 AI 생성 한도를 모두 사용했어요. 내일 다시 만나요.",
      capExhausted: true,
    };
  }

  // 페르소나 (가입 시 자동 생성됨)
  const persona = await prisma.userPersona.findUnique({
    where: { userId: input.userId },
    select: {
      presetKey: true,
      tone: true,
      formality: true,
      sentenceLength: true,
    },
  });

  // 이미 업로드된 사진을 base64로 재다운로드 (재업로드 없음)
  const photoResults = await Promise.all(
    input.storagePaths.map((p) => downloadAsBase64(p)),
  );
  const photos = photoResults.filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  const exifSummary = buildExifSummary(input.exifs);

  let draft: DiaryGenerationOutput;
  try {
    draft = await generateDiary({
      mode,
      photos: photos.length > 0 ? photos : undefined,
      // 화면의 현재 본문이 그대로 입력이다. mode A일 때만 텍스트가 없다.
      text: trimmedText,
      persona: persona ?? undefined,
      exifSummary,
      instruction: input.instruction,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "AI 생성 실패",
    };
  }

  return { ok: true, data: draft };
}
