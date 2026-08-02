import "server-only";
import { prisma } from "@/lib/db";
import { deleteImage, saveImage } from "@/lib/storage";
import { assertStorageQuota, STORAGE_FULL_MSG } from "@/lib/storage/quota";
import { getOrCreateDiaryForDate } from "./queries";
// EXIF 입력 타입은 auto-generate가 단일 출처다(preview-generate도 같은 걸 쓴다).
// 같은 모양을 여기 또 선언하면 이름만 같은 타입이 둘이 되어 import 출처가 헷갈린다.
import type { ClientExif } from "./auto-generate";

export type CaptureEntry = {
  dateKey: string;
  diaryId: string;
  imageIds: string[];
};

/**
 * 채팅으로 받은 사진을 **각자의 날짜** 일기에 DiaryImage로 저장한다.
 * `photos[i]`는 `dateKeys[i]`로 간다 — 여러 날 사진을 한 날에 몰지 않는다.
 *
 * 사진 조각(DiaryFragment.kind="photo")은 만들지 않는다 — 쿼터·GC·EXIF·캐러셀이
 * 전부 DiaryImage 기준으로 이미 완성돼 있어 인프라를 두 벌로 만들지 않는다.
 *
 * Plan 02 쿼터 규약: 업로드 **전** 판정 → 업로드 → insert와 카운터 증분을
 * **한 트랜잭션** → 실패 시 업로드분 보상 삭제(고아를 남기지 않는다).
 */
export async function savePhotosByDate(
  userId: string,
  photos: File[],
  exifs: ClientExif[],
  dateKeys: string[],
): Promise<
  { ok: true; entries: CaptureEntry[] } | { ok: false; error: string }
> {
  const addBytes = photos.reduce((sum, p) => sum + p.size, 0);
  if (addBytes > 0) {
    const quota = await assertStorageQuota(userId, addBytes);
    if (!quota.ok) return { ok: false, error: STORAGE_FULL_MSG };
  }

  // 날짜별 컨테이너를 **트랜잭션 밖에서** 확보한다(get-or-create가 자체 쓰기를 한다).
  const uniqueDates = [...new Set(dateKeys)];
  const diaryIdByDate = new Map<string, string>();
  const nextOrderByDate = new Map<string, number>();
  for (const d of uniqueDates) {
    const { id } = await getOrCreateDiaryForDate(userId, d);
    diaryIdByDate.set(d, id);
    // orderIndex는 그날 기존 사진 다음부터 이어 붙인다.
    const agg = await prisma.diaryImage.aggregate({
      where: { diaryId: id },
      _max: { orderIndex: true },
    });
    nextOrderByDate.set(d, (agg._max.orderIndex ?? -1) + 1);
  }

  const uploaded: string[] = [];
  try {
    for (const p of photos) uploaded.push(await saveImage(p, userId));
  } catch (e) {
    await Promise.all(uploaded.map((path) => deleteImage(path)));
    return {
      ok: false,
      error: e instanceof Error ? e.message : "사진 업로드에 실패했어요",
    };
  }

  try {
    const idsByDate = await prisma.$transaction(async (tx) => {
      const out = new Map<string, string[]>();
      for (let i = 0; i < uploaded.length; i++) {
        const d = dateKeys[i];
        const diaryId = diaryIdByDate.get(d)!;
        const order = nextOrderByDate.get(d)!;
        nextOrderByDate.set(d, order + 1);
        const row = await tx.diaryImage.create({
          data: {
            diaryId,
            storagePath: uploaded[i],
            sizeBytes: photos[i].size,
            exifTakenAt: exifs[i]?.takenAt ? new Date(exifs[i].takenAt!) : null,
            exifLat: exifs[i]?.lat ?? null,
            exifLng: exifs[i]?.lng ?? null,
            orderIndex: order,
          },
          select: { id: true },
        });
        out.set(d, [...(out.get(d) ?? []), row.id]);
      }
      // 카운터는 총합 1회만 증분한다(같은 사용자라 일기가 갈려도 총량은 하나).
      await tx.character.update({
        where: { userId },
        data: { storageUsedBytes: { increment: BigInt(addBytes) } },
      });
      return out;
    });

    const entries: CaptureEntry[] = uniqueDates.map((d) => ({
      dateKey: d,
      diaryId: diaryIdByDate.get(d)!,
      imageIds: idsByDate.get(d) ?? [],
    }));
    return { ok: true, entries };
  } catch (e) {
    // DB 실패 시 업로드분 보상 삭제 (Plan 02 규약: 고아를 남기지 않는다)
    await Promise.all(uploaded.map((path) => deleteImage(path)));
    return {
      ok: false,
      error: e instanceof Error ? e.message : "사진 저장에 실패했어요",
    };
  }
}
