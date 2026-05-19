"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteImage, saveImage } from "@/lib/storage";
import { upsertDiaryEmbedding } from "./embedding";
import {
  diaryInputSchema,
  moodKeySchema,
  type DiaryLocation,
  type MoodKey,
} from "./schemas";

// MIG-3 정식판:
//   - 다중 이미지(최대 5장) 처리. DiaryImage 1:N 생성.
//   - source 필드 세팅 ("manual" | "auto_a" | "auto_b" | "auto_c").
//   - 두 가지 입력 경로:
//     A) "직접 작성" — formData.image[] = File[] → 서버에서 saveImage 호출
//     B) "AI 검토 후 저장" — formData.storagePaths = JSON 배열 → 이미 업로드된 경로 재사용
//   - updateDiaryAction은 텍스트 위주(이미지 수정은 Phase 3c-2/3d/NEW-7에서).
//   - 백업 스왑 로직은 NEW-7 재생성 API에서 본격.

export type DiaryActionResult =
  | { ok: true; data: { id: string } }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Partial<
        Record<"title" | "content" | "image" | "location", string>
      >;
    };

const MAX_IMAGES = 5;
const VALID_SOURCES = ["manual", "auto_a", "auto_b", "auto_c"] as const;
type DiarySource = (typeof VALID_SOURCES)[number];

type ExifInput = {
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
};

function parseDiaryDate(raw: FormDataEntryValue | null): Date {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw))
    return new Date();
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

function parseSource(raw: FormDataEntryValue | null): DiarySource {
  if (typeof raw !== "string") return "manual";
  return VALID_SOURCES.includes(raw as DiarySource)
    ? (raw as DiarySource)
    : "manual";
}

function parseExifs(raw: FormDataEntryValue | null): ExifInput[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item): ExifInput => ({
      takenAt: typeof item?.takenAt === "string" ? item.takenAt : null,
      lat: typeof item?.lat === "number" ? item.lat : null,
      lng: typeof item?.lng === "number" ? item.lng : null,
    }));
  } catch {
    return [];
  }
}

function parseStoragePaths(raw: FormDataEntryValue | null): string[] | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .slice(0, MAX_IMAGES);
  } catch {
    return null;
  }
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
  const source = parseSource(formData.get("source"));
  const exifs = parseExifs(formData.get("exifs"));

  // 이미지 경로 결정: AI 검토 통과(storagePaths) vs 직접 작성(image File[])
  const preuploaded = parseStoragePaths(formData.get("storagePaths"));
  const storagePaths: string[] = [];
  const uploadedToCleanup: string[] = [];

  if (preuploaded && preuploaded.length > 0) {
    storagePaths.push(...preuploaded);
  } else {
    const files = formData
      .getAll("image")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, MAX_IMAGES);

    for (const file of files) {
      try {
        const path = await saveImage(file, session.userId);
        storagePaths.push(path);
        uploadedToCleanup.push(path);
      } catch (e) {
        // 부분 실패: 이미 업로드된 파일 정리 후 에러 반환
        await Promise.all(uploadedToCleanup.map((p) => deleteImage(p)));
        return {
          ok: false,
          fieldErrors: {
            image: e instanceof Error ? e.message : "이미지 업로드 실패",
          },
        };
      }
    }
  }

  const imagesCreate = storagePaths.map((path, i) => ({
    storagePath: path,
    exifTakenAt: exifs[i]?.takenAt ? new Date(exifs[i].takenAt!) : null,
    exifLat: exifs[i]?.lat ?? null,
    exifLng: exifs[i]?.lng ?? null,
    orderIndex: i,
  }));

  try {
    const diary = await prisma.diary.create({
      data: {
        userId: session.userId,
        title: parsed.data.title,
        content: parsed.data.content,
        source,
        location: parsed.data.location ?? Prisma.DbNull,
        mood: parsed.data.mood ?? null,
        createdAt: diaryDate,
        images:
          imagesCreate.length > 0 ? { create: imagesCreate } : undefined,
      },
      select: { id: true },
    });

    // 임베딩 best-effort (실패해도 저장 결과엔 영향 없음)
    await upsertDiaryEmbedding(diary.id, parsed.data.title, parsed.data.content);

    revalidatePath("/diary");
    revalidatePath("/");
    return { ok: true, data: diary };
  } catch (e) {
    // DB 실패 시 직접 업로드한 이미지 보상 정리
    // (preuploaded는 caller가 관리 — review-gate가 sessionStorage에 보관)
    if (uploadedToCleanup.length > 0) {
      await Promise.all(uploadedToCleanup.map((p) => deleteImage(p)));
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "일기 저장 실패",
    };
  }
}

export async function updateDiaryAction(
  id: string,
  formData: FormData,
): Promise<DiaryActionResult> {
  // Phase 3c-1: 텍스트·메타데이터만 수정. 이미지 수정·재생성은 Phase 3c-2/3d (NEW-7 백업 스왑).
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
      contentEditedAt: new Date(),
    },
  });

  // 임베딩 재갱신 (content 변경 가능성)
  await upsertDiaryEmbedding(id, parsed.data.title, parsed.data.content);

  revalidatePath("/diary");
  revalidatePath(`/diary/${id}`);
  revalidatePath("/");
  return { ok: true, data: { id } };
}

/**
 * AI 재생성 후 "되돌리기" — content ↔ previousContent 스왑 (NEW-7).
 * 재생성 직후 사용자가 "직전 내용이 더 좋았다" 결정 시 단번에 복구.
 * swap이라 두 번째 호출은 redo 효과.
 *
 * 응답에 갱신된 데이터를 포함해 클라이언트가 state lifting으로 동기화 가능.
 * (window.location.reload 회피)
 */
export async function revertDiaryAction(id: string): Promise<
  | {
      ok: true;
      data: {
        title: string;
        content: string;
        hasPreviousContent: boolean;
        aiGenerationVersion: number;
      };
    }
  | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  const existing = await prisma.diary.findFirst({
    where: { id, userId: session.userId },
    select: { id: true, content: true, previousContent: true },
  });
  if (!existing) return { ok: false, error: "일기를 찾을 수 없습니다" };
  if (!existing.previousContent) {
    return { ok: false, error: "되돌릴 이전 내용이 없어요" };
  }

  const updated = await prisma.diary.update({
    where: { id },
    data: {
      content: existing.previousContent,
      previousContent: existing.content,
      previousChangedAt: new Date(),
      contentEditedAt: new Date(),
    },
    select: {
      title: true,
      content: true,
      previousContent: true,
      aiGenerationVersion: true,
    },
  });

  // 스왑 후 content가 바뀌었으므로 재임베딩
  await upsertDiaryEmbedding(id, updated.title, updated.content);

  revalidatePath("/diary");
  revalidatePath(`/diary/${id}`);
  revalidatePath("/");
  return {
    ok: true,
    data: {
      title: updated.title,
      content: updated.content,
      hasPreviousContent: updated.previousContent !== null,
      aiGenerationVersion: updated.aiGenerationVersion,
    },
  };
}

export async function deleteDiaryAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "로그인이 필요합니다" };

  // 삭제 전에 이미지 storagePath 수집해 cascade 후 Storage에서도 제거
  const existing = await prisma.diary.findFirst({
    where: { id, userId: session.userId },
    select: {
      id: true,
      images: { select: { storagePath: true } },
    },
  });
  if (!existing) return { ok: false, error: "일기를 찾을 수 없습니다" };

  await prisma.diary.delete({ where: { id } });

  // Storage 정리 (best-effort, 실패해도 DB는 이미 삭제됨)
  await Promise.all(existing.images.map((img) => deleteImage(img.storagePath)));

  revalidatePath("/diary");
  revalidatePath("/");
  return { ok: true };
}
