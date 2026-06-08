"use server";

import { revalidatePath } from "next/cache";
import { captureServer } from "@/lib/analytics/server";
import { getSession } from "@/lib/auth/session";
import { getMaxImagesForUser } from "@/lib/character/queries";
import { prisma } from "@/lib/db";
import { deleteImage, saveImage } from "@/lib/storage";
import { upsertDiaryEmbedding } from "./embedding";
import { kstTodayKey } from "./kst";
import {
  diaryInputSchema,
  moodKeySchema,
  type MoodKey,
} from "./schemas";

// MIG-3 정식판:
//   - 다중 이미지(상한은 구독별: ACTIVE 10장 / 그 외 5장) 처리. DiaryImage 1:N 생성.
//   - source 필드 세팅 ("manual" | "auto_a" | "auto_b" | "auto_c").
//   - 두 가지 입력 경로:
//     A) "직접 작성" — formData.image[] = File[] → 서버에서 saveImage 호출
//     B) "AI 검토 후 저장" — formData.storagePaths = JSON 배열 → 이미 업로드된 경로 재사용
//   - updateDiaryAction: 텍스트·메타데이터 수정 + 사진 추가/제거.
//   - 백업 스왑 로직은 NEW-7 재생성 API에서 본격.

export type DiaryActionResult =
  | { ok: true; data: { id: string } }
  | {
      ok: false;
      error?: string;
      fieldErrors?: Partial<
        Record<"title" | "content" | "image", string>
      >;
    };

const VALID_SOURCES = ["manual", "auto_a", "auto_b", "auto_c"] as const;
type DiarySource = (typeof VALID_SOURCES)[number];

type ExifInput = {
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
};

// createdAt은 "일기의 날짜(달력 칸)"와 "작성 시각(목록 표시)"을 겸한다.
// Vercel은 UTC 환경이라 단순 "raw + T12:00:00"은 정오 UTC = 21:00 KST로 저장돼
// 목록 시각이 늘 "오후 09:00"으로 보이고, 자정 직후엔 미래 가드가 오작동해
// 날짜가 하루 밀렸다. 그래서 KST 날짜 기준으로 분기한다.
function parseDiaryDate(raw: FormDataEntryValue | null): Date {
  const now = new Date();
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return now;
  // 오늘(KST) 선택 → 실제 작성 시각(real instant) 저장. 목록 시각이 정확하고
  // kstDateKey로 오늘 칸에 정확히 버킷된다. (picker max=today지만 미래 입력도 now로 클램프.)
  if (raw >= kstTodayKey()) return now;
  // 과거 날짜 → 그 날 KST 정오로 앵커. 서버 TZ와 무관하게 같은 KST 날짜로 버킷되고,
  // 항상 과거라 미래 가드 오작동·"정오 UTC=21:00 KST" 아티팩트가 사라진다.
  const d = new Date(`${raw}T12:00:00+09:00`);
  return isNaN(d.getTime()) ? now : d;
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

function parseStoragePaths(
  raw: FormDataEntryValue | null,
  maxImages: number,
): string[] | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .slice(0, maxImages);
  } catch {
    return null;
  }
}

function parseRemoveImageIds(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
  } catch {
    return [];
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
    mood: parseMood(formData.get("mood")),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed) };

  const diaryDate = parseDiaryDate(formData.get("date"));
  const source = parseSource(formData.get("source"));
  const exifs = parseExifs(formData.get("exifs"));
  const maxImages = await getMaxImagesForUser(session.userId);

  // 이미지 경로 결정: AI 검토 통과(storagePaths) vs 직접 작성(image File[])
  const preuploaded = parseStoragePaths(formData.get("storagePaths"), maxImages);
  const storagePaths: string[] = [];
  const uploadedToCleanup: string[] = [];

  if (preuploaded && preuploaded.length > 0) {
    storagePaths.push(...preuploaded);
  } else {
    const files = formData
      .getAll("image")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, maxImages);

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
    await captureServer("diary_created", session.userId, {
      source,
      image_count: storagePaths.length,
      has_mood: parsed.data.mood != null,
    });
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
  // 텍스트·메타데이터 수정 + 사진 추가/제거. AI 재생성·백업 스왑은 별도(NEW-7).
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
    mood: parseMood(formData.get("mood")),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed) };

  const diaryDate = parseDiaryDate(formData.get("date"));

  await prisma.diary.update({
    where: { id },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      mood: parsed.data.mood ?? null,
      createdAt: diaryDate,
      contentEditedAt: new Date(),
    },
  });

  // 선택된 기존 사진 제거 — 이 일기(소유 확인 완료)에 속한 DiaryImage만 대상.
  // 매칭 안 되는 id는 무시. DB row 삭제 후 Storage 정리(DB→Storage 순서, lifecycle invariant).
  const removeImageIds = parseRemoveImageIds(formData.get("removeImageIds"));
  if (removeImageIds.length > 0) {
    const toRemove = await prisma.diaryImage.findMany({
      where: { id: { in: removeImageIds }, diaryId: id },
      select: { id: true, storagePath: true },
    });
    if (toRemove.length > 0) {
      await prisma.diaryImage.deleteMany({
        where: { id: { in: toRemove.map((img) => img.id) }, diaryId: id },
      });
      // Storage 정리는 best-effort (실패해도 DB는 이미 삭제됨)
      await Promise.all(toRemove.map((img) => deleteImage(img.storagePath)));
    }
  }

  // 새로 추가된 사진 저장 — createDiaryAction과 동일한 File→saveImage 경로.
  // 제거 반영 후 남은 장수를 기준으로 구독별 상한(ACTIVE 10 / 그 외 5)을 지키고,
  // orderIndex는 기존 최대값 다음부터 이어 붙인다(기존 사진 순서 보존).
  const newFiles = formData
    .getAll("image")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (newFiles.length > 0) {
    const maxImages = await getMaxImagesForUser(session.userId);
    const currentCount = await prisma.diaryImage.count({
      where: { diaryId: id },
    });
    const slots = maxImages - currentCount;
    if (slots > 0) {
      const accepted = newFiles.slice(0, slots);
      const exifs = parseExifs(formData.get("exifs"));
      const agg = await prisma.diaryImage.aggregate({
        where: { diaryId: id },
        _max: { orderIndex: true },
      });
      let nextOrder = (agg._max.orderIndex ?? -1) + 1;
      const uploaded: string[] = [];
      try {
        for (let i = 0; i < accepted.length; i++) {
          const path = await saveImage(accepted[i], session.userId);
          uploaded.push(path);
          await prisma.diaryImage.create({
            data: {
              diaryId: id,
              storagePath: path,
              exifTakenAt: exifs[i]?.takenAt ? new Date(exifs[i].takenAt!) : null,
              exifLat: exifs[i]?.lat ?? null,
              exifLng: exifs[i]?.lng ?? null,
              orderIndex: nextOrder++,
            },
          });
        }
      } catch (e) {
        // 부분 실패: 업로드된 파일 정리 후 에러 반환 (DB row는 위 루프에서 함께 생성)
        await Promise.all(uploaded.map((p) => deleteImage(p)));
        return {
          ok: false,
          fieldErrors: {
            image: e instanceof Error ? e.message : "이미지 업로드 실패",
          },
        };
      }
    }
  }

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
