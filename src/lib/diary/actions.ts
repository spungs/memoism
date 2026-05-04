"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteImage, saveImage, StorageError } from "@/lib/storage";
import { diaryInputSchema, type DiaryLocation } from "./schemas";

export type DiaryActionResult =
  | { ok: true; data: { id: string } }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Partial<Record<"title" | "content" | "image" | "location", string>>;
    };

const KEEP_EXISTING_IMAGE = "__keep__";

function parseLocation(raw: FormDataEntryValue | null): DiaryLocation | null {
  if (typeof raw !== "string" || raw === "" || raw === "null") return null;
  try {
    return JSON.parse(raw) as DiaryLocation;
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

async function readImageOrError(
  formData: FormData,
): Promise<
  | { kind: "none" }
  | { kind: "file"; file: File }
  | { kind: "error"; message: string }
> {
  const raw = formData.get("image");
  if (!(raw instanceof File) || raw.size === 0) return { kind: "none" };
  return { kind: "file", file: raw };
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
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed) };

  const imageInput = await readImageOrError(formData);
  if (imageInput.kind === "error") {
    return { ok: false, fieldErrors: { image: imageInput.message } };
  }

  let imageUrl: string | null = null;
  if (imageInput.kind === "file") {
    try {
      imageUrl = await saveImage(imageInput.file, session.userId);
    } catch (e) {
      const msg = e instanceof StorageError ? e.message : "이미지 업로드에 실패했습니다";
      return { ok: false, fieldErrors: { image: msg } };
    }
  }

  const diary = await prisma.diary.create({
    data: {
      userId: session.userId,
      title: parsed.data.title,
      content: parsed.data.content,
      images: imageUrl ? [imageUrl] : [],
      location: parsed.data.location ?? Prisma.DbNull,
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
    select: { id: true, images: true },
  });
  if (!existing) return { ok: false, error: "일기를 찾을 수 없습니다" };

  const parsed = diaryInputSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    location: parseLocation(formData.get("location")),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed) };

  // Image semantics:
  //   - field absent or "__keep__"   → leave existing image untouched
  //   - empty file (size 0) and "remove" flag → drop existing
  //   - new file                     → replace (delete old after success)
  const imageMode = formData.get("imageMode");
  const imageInput = await readImageOrError(formData);
  if (imageInput.kind === "error") {
    return { ok: false, fieldErrors: { image: imageInput.message } };
  }

  let nextImages = existing.images;
  let imageToDelete: string | null = null;

  if (imageInput.kind === "file") {
    let uploaded: string;
    try {
      uploaded = await saveImage(imageInput.file, session.userId);
    } catch (e) {
      const msg = e instanceof StorageError ? e.message : "이미지 업로드에 실패했습니다";
      return { ok: false, fieldErrors: { image: msg } };
    }
    nextImages = [uploaded];
    if (existing.images[0]) imageToDelete = existing.images[0];
  } else if (imageMode === "remove") {
    nextImages = [];
    if (existing.images[0]) imageToDelete = existing.images[0];
  } else if (imageMode !== KEEP_EXISTING_IMAGE && imageMode !== null) {
    // Unknown mode → ignore; treat as keep.
  }

  await prisma.diary.update({
    where: { id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      images: nextImages,
      location: parsed.data.location ?? Prisma.DbNull,
    },
  });

  if (imageToDelete) await deleteImage(imageToDelete);

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
    select: { id: true, images: true },
  });
  if (!existing) return { ok: false, error: "일기를 찾을 수 없습니다" };

  await prisma.diary.delete({ where: { id } });
  await Promise.all(existing.images.map((url) => deleteImage(url)));

  revalidatePath("/diary");
  revalidatePath("/");
  return { ok: true };
}
