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
