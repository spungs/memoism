import "server-only";
import { prisma } from "@/lib/db";
import { deleteImage } from "@/lib/storage";

/**
 * DiaryImage 행을 DB에서 지운 **뒤** 스토리지 파일을 정리한다(DB → Storage 순서).
 *
 * 다른 행이 아직 같은 파일을 가리키면 지우지 않는다. 한 파일을 일기 두 개가 나눠
 * 가진 상태에서 한쪽을 지우면, 남은 일기의 사진이 복구할 수 없게 깨졌다
 * (2026-09-29 점검 H8). 저장 쪽에서 공유가 생기지 않게 막지만, 이미 생긴 공유나
 * 동시 요청으로 생긴 공유까지 여기서 한 번 더 막는다.
 *
 * best-effort: 스토리지 삭제 실패는 deleteImage가 로그만 남긴다. 남은 파일은 GC가 줍는다.
 */
export async function deleteUnreferencedImages(paths: string[]): Promise<void> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return;
  const stillUsed = await prisma.diaryImage.findMany({
    where: { storagePath: { in: unique } },
    select: { storagePath: true },
  });
  const keep = new Set(stillUsed.map((r) => r.storagePath));
  await Promise.all(unique.filter((p) => !keep.has(p)).map((p) => deleteImage(p)));
}
