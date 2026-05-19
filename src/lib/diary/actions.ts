"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  diaryInputSchema,
  moodKeySchema,
  type DiaryLocation,
  type MoodKey,
} from "./schemas";

// Phase 3 MIG-3 진입 전까지 이미지 처리(saveImage/DiaryImage 1:N)는 임시 비활성화.
// 현재 일기 텍스트만 저장·수정·삭제 가능. 다중 이미지 첨부는 Phase 3 이후.

export type DiaryActionResult =
  | { ok: true; data: { id: string } }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Partial<Record<"title" | "content" | "image" | "location", string>>;
    };

function parseDiaryDate(raw: FormDataEntryValue | null): Date {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date();
  const d = new Date(raw + "T12:00:00");
  if (isNaN(d.getTime())) return new Date();
  return d > new Date() ? new Date() : d;
}

function parseLocation(raw: FormDataEntryValue | null): DiaryLocation | null {
  if (typeof raw !== "string" || raw === "" || raw === "null") return null;
  try {
    return JSON.parse(raw) as DiaryLocation;
  } catch {
    return null;
  }
}

function parseMood(raw: FormDataEntryValue | null): MoodKey | null {
  if (typeof raw !== "string" || raw === "" || raw === "null") return null;
  const result = moodKeySchema.safeParse(raw);
  return result.success ? result.data : null;
}

function fieldErrorsFromZod(
  error: ReturnType<typeof diaryInputSchema.safeParse>,
): NonNullable<Extract<DiaryActionResult, { ok: false }>["fieldErrors"]> {
  const out: Record<string, string> = {};
  if (error.success) return out;
  for (const issue of error.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createDiaryAction(
  formData: FormData,
): Promise<DiaryActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  const parsed = diaryInputSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    location: parseLocation(formData.get("location")),
    mood: parseMood(formData.get("mood")),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed) };

  const diaryDate = parseDiaryDate(formData.get("date"));

  const diary = await prisma.diary.create({
    data: {
      userId: session.userId,
      title: parsed.data.title,
      content: parsed.data.content,
      location: parsed.data.location ?? Prisma.DbNull,
      mood: parsed.data.mood ?? null,
      createdAt: diaryDate,
    },
    select: { id: true },
  });

  revalidatePath("/diary");
  revalidatePath("/");
  return { ok: true, data: diary };
}

export async function updateDiaryAction(
  id: string,
  formData: FormData,
): Promise<DiaryActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  const existing = await prisma.diary.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "일기를 찾을 수 없습니다" };

  const parsed = diaryInputSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    location: parseLocation(formData.get("location")),
    mood: parseMood(formData.get("mood")),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed) };

  const diaryDate = parseDiaryDate(formData.get("date"));

  await prisma.diary.update({
    where: { id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      location: parsed.data.location ?? Prisma.DbNull,
      mood: parsed.data.mood ?? null,
      createdAt: diaryDate,
    },
  });

  revalidatePath("/diary");
  revalidatePath(`/diary/${id}`);
  revalidatePath("/");
  return { ok: true, data: { id } };
}

export async function deleteDiaryAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  const existing = await prisma.diary.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "일기를 찾을 수 없습니다" };

  await prisma.diary.delete({ where: { id } });

  revalidatePath("/diary");
  revalidatePath("/");
  return { ok: true };
}
