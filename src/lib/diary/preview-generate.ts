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
import type { ClientExif } from "./auto-generate";

// 저장 전 검토 게이트의 "다시 생성"용 (DB 저장 X).
// auto-generate와 달리 사진은 *이미 Storage에 업로드돼 있어* storagePath로 재다운로드한다.
// 일일 cap만 적용 (per-item cap은 정책상 제거됨, regenerate.ts 주석 참고).

export type PreviewGenerateInput = {
  userId: string;
  storagePaths: string[];
  exifs: ClientExif[];
  text?: string;
  mode: DiaryGenerationMode;
};

export type PreviewGenerateResult =
  | { ok: true; data: DiaryGenerationOutput }
  | { ok: false; error: string; capExhausted?: boolean };

export async function previewGenerateDiary(
  input: PreviewGenerateInput,
): Promise<PreviewGenerateResult> {
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
  const text = input.mode === "A" ? undefined : input.text;

  let draft: DiaryGenerationOutput;
  try {
    draft = await generateDiary({
      mode: input.mode,
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

  return { ok: true, data: draft };
}
