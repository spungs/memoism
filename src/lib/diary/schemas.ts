import { z } from "zod";

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  name: z.string().max(200).optional(),
});

export const diaryInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해주세요")
    .max(200, "제목은 200자 이내여야 합니다"),
  content: z.string().trim().min(1, "내용을 입력해주세요"),
  location: locationSchema.nullable().optional(),
});

export type DiaryInput = z.infer<typeof diaryInputSchema>;
export type DiaryLocation = z.infer<typeof locationSchema>;
