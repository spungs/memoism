import { z } from "zod";

/** 제목 상한. 저장 검증과 재정리 API가 같은 값을 봐야 drift가 안 생긴다. */
export const MAX_DIARY_TITLE_LENGTH = 200;

export const moodKeySchema = z.enum([
  "joy",
  "calm",
  "sad",
  "love",
  "anger",
  "tired",
]);

export const diaryInputSchema = z.object({
  // 제목은 필수 (DB 컬럼 not null) — UI도 "(선택)" 표기 없이 필수로 안내한다.
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해주세요")
    .max(MAX_DIARY_TITLE_LENGTH, `제목은 ${MAX_DIARY_TITLE_LENGTH}자 이내여야 합니다`),
  content: z.string().trim().min(1, "내용을 입력해주세요"),
  mood: moodKeySchema.nullable().optional(),
});

export type DiaryInput = z.infer<typeof diaryInputSchema>;
export type MoodKey = z.infer<typeof moodKeySchema>;

/**
 * AI 정리 입력 본문 상한. 최초 정리·재정리 전 경로가 이 값을 공유한다.
 *
 * 왜 3000인가: 사용자 글이 있으면 AI는 *보존 모드*로 동작해 입력보다 짧아지지 않게
 * 쓴다. 그런데 AI 출력 스키마는 3000자가 상한이다(gemini.ts draftResponseSchema).
 * 즉 3000자를 넘는 입력은 반드시 출력 검증에서 터진다 — 사용자에겐 "Gemini 응답
 * 스키마 오류"라는 불투명한 메시지로 보이고, 그 전에 AI 사용 횟수까지 차감된다.
 * 여기서 미리 막아 명확한 한국어 메시지를 주고 횟수도 아낀다.
 *
 * 올리려면 gemini.ts의 draftResponseSchema.content.max와 maxOutputTokens를 함께
 * 올려야 한다. 셋은 한 몸이다.
 */
export const MAX_AI_INPUT_CONTENT_LENGTH = 3000;
