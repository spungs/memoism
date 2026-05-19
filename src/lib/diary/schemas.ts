import { z } from "zod";

// strict() — 알 수 없는 추가 키가 있으면 거부. 사용자가 보낸 JSON에
// 임의 필드가 끼어들지 못하게 함 (QA H-7).
export const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    name: z.string().max(200).optional(),
  })
  .strict();

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
  location: locationSchema.nullable().optional(),
  mood: moodKeySchema.nullable().optional(),
});

export type DiaryInput = z.infer<typeof diaryInputSchema>;
export type DiaryLocation = z.infer<typeof locationSchema>;
export type MoodKey = z.infer<typeof moodKeySchema>;
