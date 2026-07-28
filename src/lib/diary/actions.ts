"use server";

import { revalidatePath } from "next/cache";
import { captureServer } from "@/lib/analytics/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteImage, getObjectSize, saveImage } from "@/lib/storage";
import { assertStorageQuota, STORAGE_FULL_MSG } from "@/lib/storage/quota";
import { upsertDiaryEmbedding } from "./embedding";
import { diaryCreatedAtForDateKey } from "./kst";
import { MAX_IMAGES_PER_DIARY } from "./limits";
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
// 앵커 로직은 diaryCreatedAtForDateKey(getOrCreateDiaryForDate와 공유)에 위임.
function parseDiaryDate(raw: FormDataEntryValue | null): Date {
  const key = typeof raw === "string" ? raw : "";
  return diaryCreatedAtForDateKey(key, new Date());
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

// 티어와 무관한 평평한 안전 상한 — 경로 하나당 버킷 조회가 1회씩 붙으므로
// 조작된 대량 목록이 요청 하나로 수천 번 조회를 유발하는 걸 막는다.
// (티어 차별은 용량 쿼터로만 한다 — 개수는 레버로 쓰지 않는다.)
const MAX_STORAGE_PATHS = 100;

/**
 * 검토 게이트가 넘긴 storagePath 목록. 업로드는 항상 `{userId}/...`로 저장되므로
 * 본인 접두사만 통과시킨다 — 남의 경로를 심어 사진을 노출시키거나
 * 일기 삭제 시 남의 파일을 지우는 걸 차단.
 */
function parseStoragePaths(
  raw: FormDataEntryValue | null,
  userId: string,
): string[] | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const prefix = `${userId}/`;
    return parsed
      .filter(
        (p): p is string =>
          typeof p === "string" && p.length > 0 && p.startsWith(prefix),
      )
      .slice(0, MAX_STORAGE_PATHS);
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

  // 이미지 경로 결정: AI 검토 통과(storagePaths) vs 직접 작성(image File[])
  const parsedPaths = parseStoragePaths(
    formData.get("storagePaths"),
    session.userId,
  );
  const preuploaded = parsedPaths && parsedPaths.length > 0 ? parsedPaths : null;
  const files = preuploaded
    ? []
    : formData
        .getAll("image")
        .filter((f): f is File => f instanceof File && f.size > 0);

  // 개수 상한은 티어와 무관한 고정값. 초과분을 조용히 버리지 않고 이유를 알린다.
  if ((preuploaded?.length ?? files.length) > MAX_IMAGES_PER_DIARY) {
    return {
      ok: false,
      fieldErrors: {
        image: `사진은 일기 한 건에 ${MAX_IMAGES_PER_DIARY}장까지 넣을 수 있어요`,
      },
    };
  }

  const storagePaths: string[] = [];
  // storagePaths와 같은 인덱스의 바이트 크기 (스토리지 쿼터 카운터용).
  const sizes: number[] = [];
  const uploadedToCleanup: string[] = [];

  if (preuploaded) {
    storagePaths.push(...preuploaded);
    // 검토 게이트에서 이미 업로드된 사진은 File이 없어 버킷에서 크기를 조회한다.
    sizes.push(...(await Promise.all(preuploaded.map(getObjectSize))));
  }

  // 쿼터는 업로드·저장 확정 **전에** 판정한다 — 초과면 한 장도 올리지 않고,
  // 이미 있는 사진·일기는 건드리지 않는다(하드룰: 삭제 없이 새 업로드만 차단).
  const addBytes = preuploaded
    ? sizes.reduce((sum, n) => sum + n, 0)
    : files.reduce((sum, f) => sum + f.size, 0);
  if (addBytes > 0) {
    const quota = await assertStorageQuota(session.userId, addBytes);
    if (!quota.ok) return { ok: false, error: STORAGE_FULL_MSG };
  }

  if (!preuploaded) {
    for (const file of files) {
      try {
        const path = await saveImage(file, session.userId);
        storagePaths.push(path);
        sizes.push(file.size);
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
    sizeBytes: sizes[i] ?? 0,
    exifTakenAt: exifs[i]?.takenAt ? new Date(exifs[i].takenAt!) : null,
    exifLat: exifs[i]?.lat ?? null,
    exifLng: exifs[i]?.lng ?? null,
    orderIndex: i,
  }));

  const totalNewBytes = imagesCreate.reduce((sum, img) => sum + img.sizeBytes, 0);

  try {
    // 일기·이미지 insert와 사용량 카운터를 한 트랜잭션으로 — 한쪽만 반영되면
    // storageUsedBytes 캐시가 드리프트한다(coinBalance와 같은 규약).
    const diary = await prisma.$transaction(async (tx) => {
      const created = await tx.diary.create({
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
      if (totalNewBytes > 0) {
        await tx.character.update({
          where: { userId: session.userId },
          data: { storageUsedBytes: { increment: BigInt(totalNewBytes) } },
        });
      }
      return created;
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
      select: { id: true, storagePath: true, sizeBytes: true },
    });
    if (toRemove.length > 0) {
      const removedBytes = toRemove.reduce((sum, img) => sum + img.sizeBytes, 0);
      // row 삭제와 카운터 감산은 원자적으로
      await prisma.$transaction([
        prisma.diaryImage.deleteMany({
          where: { id: { in: toRemove.map((img) => img.id) }, diaryId: id },
        }),
        ...(removedBytes > 0
          ? [
              prisma.character.update({
                where: { userId: session.userId },
                data: { storageUsedBytes: { decrement: BigInt(removedBytes) } },
              }),
            ]
          : []),
      ]);
      // Storage 정리는 best-effort (실패해도 DB는 이미 삭제됨)
      await Promise.all(toRemove.map((img) => deleteImage(img.storagePath)));
    }
  }

  // 새로 추가된 사진 저장 — createDiaryAction과 동일한 File→saveImage 경로.
  // orderIndex는 기존 최대값 다음부터 이어 붙인다(기존 사진 순서 보존).
  const newFiles = formData
    .getAll("image")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (newFiles.length > 0) {
    // 제거 반영 후 남은 장수 기준으로 판정. 초과분을 조용히 버리지 않는다.
    const currentCount = await prisma.diaryImage.count({
      where: { diaryId: id },
    });
    const slots = MAX_IMAGES_PER_DIARY - currentCount;
    if (newFiles.length > slots) {
      return {
        ok: false,
        fieldErrors: {
          image:
            slots > 0
              ? `사진은 일기 한 건에 ${MAX_IMAGES_PER_DIARY}장까지예요. ${slots}장 더 넣을 수 있어요.`
              : `사진은 일기 한 건에 ${MAX_IMAGES_PER_DIARY}장까지예요. 기존 사진을 지우면 추가할 수 있어요.`,
        },
      };
    }

    const addedBytes = newFiles.reduce((sum, f) => sum + f.size, 0);
    // 업로드 전 쿼터 판정. 초과 시 사진만 거부하고, 이미 반영된 본문 수정과
    // 기존 사진은 그대로 둔다(사용자가 쓴 글을 잃지 않게).
    const quota = await assertStorageQuota(session.userId, addedBytes);
    if (!quota.ok) return { ok: false, error: STORAGE_FULL_MSG };

    const exifs = parseExifs(formData.get("exifs"));
    const agg = await prisma.diaryImage.aggregate({
      where: { diaryId: id },
      _max: { orderIndex: true },
    });
    const nextOrder = (agg._max.orderIndex ?? -1) + 1;
    const uploaded: string[] = [];
    try {
      // 업로드를 먼저 끝낸 뒤 DB 반영을 한 트랜잭션으로 묶는다. 업로드는 네트워크라
      // 트랜잭션 안에 두면 오래 잡히고, 건건 insert면 중간 실패 시 앞선 row는 남은 채
      // 파일만 정리돼 깨진 이미지가 된다.
      for (const file of newFiles) {
        uploaded.push(await saveImage(file, session.userId));
      }
      await prisma.$transaction([
        ...uploaded.map((path, i) =>
          prisma.diaryImage.create({
            data: {
              diaryId: id,
              storagePath: path,
              sizeBytes: newFiles[i].size,
              exifTakenAt: exifs[i]?.takenAt
                ? new Date(exifs[i].takenAt!)
                : null,
              exifLat: exifs[i]?.lat ?? null,
              exifLng: exifs[i]?.lng ?? null,
              orderIndex: nextOrder + i,
            },
          }),
        ),
        prisma.character.update({
          where: { userId: session.userId },
          data: { storageUsedBytes: { increment: BigInt(addedBytes) } },
        }),
      ]);
    } catch (e) {
      // 부분 실패: 업로드된 파일 정리 후 에러 반환 (DB는 트랜잭션이라 전부 롤백)
      await Promise.all(uploaded.map((p) => deleteImage(p)));
      return {
        ok: false,
        fieldErrors: {
          image: e instanceof Error ? e.message : "이미지 업로드 실패",
        },
      };
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

  // 삭제 전에 이미지 storagePath 수집해 cascade 후 Storage에서도 제거.
  // cascade는 DiaryImage별 삭제 이벤트를 주지 않으므로 감산할 바이트도 여기서 미리 합산한다.
  const existing = await prisma.diary.findFirst({
    where: { id, userId: session.userId },
    select: {
      id: true,
      images: { select: { storagePath: true, sizeBytes: true } },
    },
  });
  if (!existing) return { ok: false, error: "일기를 찾을 수 없습니다" };

  const freedBytes = existing.images.reduce((sum, img) => sum + img.sizeBytes, 0);
  await prisma.$transaction([
    prisma.diary.delete({ where: { id } }),
    ...(freedBytes > 0
      ? [
          prisma.character.update({
            where: { userId: session.userId },
            data: { storageUsedBytes: { decrement: BigInt(freedBytes) } },
          }),
        ]
      : []),
  ]);

  // Storage 정리 (best-effort, 실패해도 DB는 이미 삭제됨)
  await Promise.all(existing.images.map((img) => deleteImage(img.storagePath)));

  revalidatePath("/diary");
  revalidatePath("/");
  return { ok: true };
}
