"use server";

import { revalidatePath } from "next/cache";
import { captureServer } from "@/lib/analytics/server";
import { getSession } from "@/lib/auth/session";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deleteImage, getObjectSize, saveImage } from "@/lib/storage";
import { assertStorageQuota, STORAGE_FULL_MSG } from "@/lib/storage/quota";
import { reembedDiaryWithFragments } from "./fragment-embed";
import { deleteUnreferencedImages } from "./image-cleanup";
import { diaryCreatedAtForDateKey, kstDateKey } from "./kst";
import { findDiaryForDate, lockUserDiaries } from "./queries";
import { isValidDateKey, todayKeyInZone } from "@/lib/tz";
import { getRequestTimeZone } from "@/lib/tz-server";
import { MAX_IMAGES_PER_REQUEST } from "./limits";
import {
  diaryInputSchema,
  moodKeySchema,
  type MoodKey,
} from "./schemas";

// MIG-3 정식판:
//   - 다중 이미지(상한은 일기당 10장 고정, 티어 무관 — limits.ts) 처리. DiaryImage 1:N 생성.
//   - source 필드 세팅 ("manual" | "auto_a" | "auto_b" | "auto_c").
//   - 두 가지 입력 경로:
//     A) "직접 작성" — formData.image[] = File[] → 서버에서 saveImage 호출
//     B) "AI 검토 후 저장" — formData.storagePaths = JSON 배열 → 이미 업로드된 경로 재사용
//   - updateDiaryAction: 텍스트·메타데이터 수정 + 사진 추가/제거.
//   - 백업 스왑 로직은 NEW-7 재생성 API에서 본격.

export type DiaryActionResult =
  // merged: 그날 이미 있던 일기에 이어 넣었다(하루에 일기 하나, 점검 M5).
  | { ok: true; data: { id: string; merged?: boolean } }
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
//
// 날짜는 **현지 날짜**다(해외여행, 2026-09-29). 없거나 형식이 틀리면 현지 오늘, 현지
// 오늘보다 늦으면 오늘로 둔다 — 날짜 선택기가 막지만 서버 액션은 공개 엔드포인트다.
function parseDiaryDate(raw: FormDataEntryValue | null, timeZone: string): Date {
  const today = todayKeyInZone(timeZone);
  const key =
    typeof raw === "string" && isValidDateKey(raw) ? raw : today;
  return diaryCreatedAtForDateKey(key > today ? today : key, new Date());
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
      // 파싱되는 날짜만 — 아니면 Invalid Date로 저장 전체가 실패한다(점검 L2, chat과 같은 규약).
      takenAt:
        typeof item?.takenAt === "string" && !Number.isNaN(Date.parse(item.takenAt))
          ? item.takenAt
          : null,
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
 * 미리 올린 사진이 이미 다른 DiaryImage에 들어가 있을 때. 같은 초안을 다시 저장한
 * 경우다(첫 저장 응답이 끊겨 재시도). `diaryId`가 있으면 그 일기가 이 초안의 첫 저장이다.
 */
class AlreadySavedError extends Error {
  constructor(readonly diaryId: string | null) {
    super("already_saved");
  }
}

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

/** 지운 사진 행 크기의 합만큼 사용량 카운터를 깎는다. 호출자 트랜잭션 안에서 부른다. */
async function decrementStorageUsed(
  tx: Prisma.TransactionClient,
  userId: string,
  rows: { size_bytes: number }[],
): Promise<void> {
  const bytes = rows.reduce((sum, r) => sum + Number(r.size_bytes), 0);
  if (bytes <= 0) return;
  await tx.character.update({
    where: { userId },
    data: { storageUsedBytes: { decrement: BigInt(bytes) } },
  });
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

  const diaryDate = parseDiaryDate(formData.get("date"), await getRequestTimeZone());
  const source = parseSource(formData.get("source"));
  const exifs = parseExifs(formData.get("exifs"));

  // 이미지 경로 결정: AI 검토 통과(storagePaths) vs 직접 작성(image File[])
  const parsedPaths = parseStoragePaths(
    formData.get("storagePaths"),
    session.userId,
  );
  // 같은 경로가 두 번 오면 DiaryImage 두 행이 한 파일을 가리키게 된다 — 중복부터 없앤다(점검 H8).
  const preuploaded =
    parsedPaths && parsedPaths.length > 0 ? [...new Set(parsedPaths)] : null;
  const files = preuploaded
    ? []
    : formData
        .getAll("image")
        .filter((f): f is File => f instanceof File && f.size > 0);

  // 개수 상한은 티어와 무관한 고정값. 초과분을 조용히 버리지 않고 이유를 알린다.
  if ((preuploaded?.length ?? files.length) > MAX_IMAGES_PER_REQUEST) {
    return {
      ok: false,
      fieldErrors: {
        image: `사진은 한 번에 ${MAX_IMAGES_PER_REQUEST}장까지 올릴 수 있어요`,
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

  let diary: { id: string; merged: boolean };
  try {
    // 일기·이미지 insert와 사용량 카운터를 한 트랜잭션으로 — 한쪽만 반영되면
    // storageUsedBytes 캐시가 드리프트한다(coinBalance와 같은 규약).
    diary = await prisma.$transaction(async (tx) => {
      if (preuploaded) {
        // 같은 사용자의 저장을 한 줄로 세운다. 응답이 끊겨 다시 누른 요청이 첫 요청과
        // 겹쳐도 아래 확인이 둘 다 "아직 없음"으로 통과하지 않게(트랜잭션 끝에 풀린다).
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.userId}))`;
        // 이미 일기에 들어간 사진이면 새 일기를 만들지 않는다. 만들면 한 파일을 일기 두
        // 개가 나눠 갖고, 한쪽을 지울 때 남은 쪽 사진이 깨진다(점검 H8).
        const taken = await tx.diaryImage.findMany({
          where: { storagePath: { in: storagePaths } },
          select: { diaryId: true, diary: { select: { userId: true } } },
        });
        if (taken.length > 0) {
          const ids = new Set(taken.map((r) => r.diaryId));
          const sameDraft =
            ids.size === 1 &&
            taken.length === storagePaths.length &&
            taken.every((r) => r.diary.userId === session.userId);
          throw new AlreadySavedError(sameDraft ? [...ids][0] : null);
        }
      }
      if (totalNewBytes > 0) {
        await tx.character.update({
          where: { userId: session.userId },
          data: { storageUsedBytes: { increment: BigInt(totalNewBytes) } },
        });
      }

      // 하루에 일기는 하나다(점검 M5). 그날 일기가 이미 있으면(메이와 나눈 조각이 모인
      // 일기 포함) 새로 만들지 않고 이어 넣는다 — 그래야 정리할 때 직접 쓴 글과 그날
      // 조각이 한 일기에서 함께 엮인다. 찾고-만들기가 겹치지 않게 사용자 단위로 줄 세운다.
      await lockUserDiaries(tx, session.userId);
      const sameDay = await findDiaryForDate(session.userId, kstDateKey(diaryDate), tx);
      if (sameDay) {
        const current = await tx.diary.findUniqueOrThrow({
          where: { id: sameDay.id },
          select: { title: true, content: true, mood: true },
        });
        const agg = await tx.diaryImage.aggregate({
          where: { diaryId: sameDay.id },
          _max: { orderIndex: true },
        });
        const nextOrder = (agg._max.orderIndex ?? -1) + 1;
        const keptTitle = current.title.trim();
        const newTitle = parsed.data.title.trim();
        // 제목이 이미 있으면 유지하고, 새 제목은 이어 쓰는 글의 첫 줄로 남긴다 —
        // 사용자가 쓴 말을 버리지 않는다.
        const addition = [
          keptTitle && newTitle && newTitle !== keptTitle ? newTitle : "",
          parsed.data.content.trim(),
        ]
          .filter(Boolean)
          .join("\n");
        await tx.diary.update({
          where: { id: sameDay.id },
          data: {
            title: keptTitle || newTitle,
            content: [current.content.trim(), addition].filter(Boolean).join("\n\n"),
            // 아직 글이 없는 일기(채팅이 만든 빈 일기)의 감정은 기본값(평온)일 뿐이다 —
            // 처음 직접 쓴 글의 감정을 쓴다. 이미 글이 있으면 그 감정을 유지한다.
            mood:
              !current.title.trim() && !current.content.trim()
                ? (parsed.data.mood ?? current.mood)
                : (current.mood ?? parsed.data.mood ?? null),
            contentEditedAt: new Date(),
            images:
              imagesCreate.length > 0
                ? {
                    create: imagesCreate.map((img) => ({
                      ...img,
                      orderIndex: nextOrder + img.orderIndex,
                    })),
                  }
                : undefined,
          },
        });
        // 목록에 안 보이던 빈 일기에 채운 거면 사용자 눈엔 새 일기다 — "이어서 넣었어요"
        // 안내를 띄우지 않는다.
        return { id: sameDay.id, merged: !sameDay.empty };
      }

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
      return { id: created.id, merged: false };
    });
  } catch (e) {
    if (e instanceof AlreadySavedError) {
      // 같은 초안의 첫 저장이 이미 끝났다 — 새로 만들지 않고 그 일기로 보낸다.
      if (e.diaryId) return { ok: true, data: { id: e.diaryId } };
      return {
        ok: false,
        error: "이미 다른 일기에 저장된 사진이 있어요. 새로고침한 뒤 다시 확인해주세요.",
      };
    }
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

  // 여기부터는 커밋 이후다. 예전엔 아래까지 위 try 안에 있어, 여기서 예외가 나면 보상
  // 정리가 **이미 저장된** 사진 파일을 지울 수 있었다(점검 H8). 아래는 모두 best-effort다.
  // 이어 넣은 경우 본문이 합쳐졌고 조각도 있을 수 있다 — DB 기준으로 다시 임베딩한다.
  await reembedDiaryWithFragments(diary.id);

  revalidatePath("/diary");
  revalidatePath("/");
  await captureServer("diary_created", session.userId, {
    source,
    image_count: storagePaths.length,
    has_mood: parsed.data.mood != null,
    merged: diary.merged,
  });
  return { ok: true, data: diary };
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
    select: { id: true, createdAt: true },
  });
  if (!existing) return { ok: false, error: "일기를 찾을 수 없습니다" };

  const parsed = diaryInputSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    mood: parseMood(formData.get("mood")),
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed) };

  const diaryDate = parseDiaryDate(formData.get("date"), await getRequestTimeZone());

  // 다른 날로 옮길 때 그날에 이미 일기가 있으면 막는다 — 하루에 일기는 하나다(점검 M5).
  // 확인과 옮기기를 사용자 단위 잠금 안에서 한다 — 밖에서 확인하면 그 사이 같은 날
  // 새 일기 저장이 끼어들어 두 편이 됐다. 목록에 안 보이는 빈 일기만 있는 날은 사용자
  // 눈엔 빈 날이라 막지 않는다(그날 일기로는 이 일기가 먼저 골라진다 — findDiaryForDate).
  const newKey = kstDateKey(diaryDate);
  const moved = await prisma.$transaction(async (tx) => {
    if (newKey !== kstDateKey(existing.createdAt)) {
      await lockUserDiaries(tx, session.userId);
      const other = await findDiaryForDate(session.userId, newKey, tx);
      if (other && !other.empty) return false;
    }
    await tx.diary.update({
      where: { id },
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        mood: parsed.data.mood ?? null,
        createdAt: diaryDate,
        contentEditedAt: new Date(),
      },
    });
    return true;
  });
  if (!moved) {
    return { ok: false, error: "그 날에는 이미 일기가 있어요. 한 날에는 일기 하나만 둘 수 있어요." };
  }

  // 선택된 기존 사진 제거 — 이 일기(소유 확인 완료)에 속한 DiaryImage만 대상.
  // 매칭 안 되는 id는 무시. DB row 삭제 후 Storage 정리(DB→Storage 순서, lifecycle invariant).
  const removeImageIds = parseRemoveImageIds(formData.get("removeImageIds"));
  if (removeImageIds.length > 0) {
    // row 삭제와 카운터 감산은 원자적으로. 감산은 **이번에 실제로 지운 행**의 크기로 한다
    // — 먼저 읽은 값으로 깎으면 두 번 누른 요청이 같은 사진을 두 번 감산했다(점검 L9).
    const removed = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ storage_path: string; size_bytes: number }[]>`
        DELETE FROM app.diary_images
        WHERE id IN (${Prisma.join(removeImageIds)}) AND diary_id = ${id}
        RETURNING storage_path, size_bytes`;
      await decrementStorageUsed(tx, session.userId, rows);
      return rows;
    });
    // Storage 정리는 best-effort (실패해도 DB는 이미 삭제됨). 다른 일기가 아직 쓰는
    // 파일은 남긴다(점검 H8).
    await deleteUnreferencedImages(removed.map((r) => r.storage_path));
  }

  // 새로 추가된 사진 저장 — createDiaryAction과 동일한 File→saveImage 경로.
  // orderIndex는 기존 최대값 다음부터 이어 붙인다(기존 사진 순서 보존).
  const newFiles = formData
    .getAll("image")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (newFiles.length > 0) {
    // 요청당 상한만 본다. 일기 총량은 용량 쿼터가 지킨다(로드맵 확정 결정).
    if (newFiles.length > MAX_IMAGES_PER_REQUEST) {
      return {
        ok: false,
        fieldErrors: {
          image: `사진은 한 번에 ${MAX_IMAGES_PER_REQUEST}장까지 올릴 수 있어요`,
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

  // 임베딩 재갱신 (content 변경 가능성). 본문만 넣으면 조각이 있는 일기를 손으로
  // 저장할 때마다 조각이 임베딩에서 빠져 회상에서 사라진다.
  await reembedDiaryWithFragments(id);

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

  // 스왑 후 content가 바뀌었으므로 재임베딩. 조각은 되돌리기와 무관하게 보존되므로
  // 임베딩 입력에 계속 있어야 한다 (본문만 넣으면 되돌릴 때마다 조각이 빠진다).
  await reembedDiaryWithFragments(id);

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

  const owned = await prisma.diary.findFirst({
    where: { id, userId: session.userId },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: "일기를 찾을 수 없습니다" };

  // 사진 행을 먼저 지우며 실제로 지운 크기만 감산한다(cascade는 행별 크기를 주지 않는다).
  // 미리 읽은 값으로 깎으면 두 번 누른 삭제나 동시에 사진을 뺀 수정이 이중 감산했다(점검 L9).
  const removed = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ storage_path: string; size_bytes: number }[]>`
      DELETE FROM app.diary_images WHERE diary_id = ${id}
      RETURNING storage_path, size_bytes`;
    await tx.diary.deleteMany({ where: { id, userId: session.userId } });
    await decrementStorageUsed(tx, session.userId, rows);
    return rows;
  });

  // Storage 정리 (best-effort, 실패해도 DB는 이미 삭제됨). 다른 일기가 아직 쓰는
  // 파일은 남긴다(점검 H8).
  await deleteUnreferencedImages(removed.map((r) => r.storage_path));

  revalidatePath("/diary");
  revalidatePath("/");
  return { ok: true };
}
