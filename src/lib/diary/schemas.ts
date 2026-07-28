import { z } from "zod";

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
    .max(200, "제목은 200자 이내여야 합니다"),
  content: z.string().trim().min(1, "내용을 입력해주세요"),
  mood: moodKeySchema.nullable().optional(),
});

export type DiaryInput = z.infer<typeof diaryInputSchema>;
export type MoodKey = z.infer<typeof moodKeySchema>;

/**
 * AI 정리 입력 본문 상한.
 *
 * diaryInputSchema.content에는 상한이 없어(저장된 일기는 얼마든지 길 수 있다)
 * 넉넉히 잡는다. AI 출력 상한(gemini.ts의 3000자)과는 다른 값이다 — 여긴 입력이다.
 */
export const MAX_AI_INPUT_CONTENT_LENGTH = 10000;
