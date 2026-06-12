import "server-only";
import { prisma } from "@/lib/db";
import { listBucketObjects, deleteImages, type BucketObject } from "./index";

// 고아 이미지 GC.
//   고아 = 버킷엔 있으나 어떤 DiaryImage.storagePath도 가리키지 않는 객체.
//   생성 원인은 AI auto-generate 흐름에서 업로드만 되고 저장(createDiary)되지
//   않은 경우(검토 이탈 / Gemini 실패 후 미정리). src/lib/diary/auto-generate.ts 참고.
//
// 안전 설계:
//   1) grace: 업로드 후 graceHours 이상 지난 것만 대상 — 진행 중인 검토 세션의
//      방금-업로드분을 절대 건드리지 않는다.
//   2) abort guard: 버킷에 객체가 있는데 DiaryImage 참조가 0이면 DB 조회 이상으로
//      간주하고 중단(전량 오삭제 방지).
//   3) delete 직전 재대조: 삭제 목록에서 참조된 경로를 한 번 더 제거.

export interface OrphanObject {
  path: string;
  ownerId: string;
  createdAt: string;
  sizeBytes: number;
}

export interface OrphanScan {
  scannedObjects: number;
  referencedCount: number;
  orphanTotal: number; // 미참조 전체 (grace 적용 전)
  graceHours: number;
  eligibleCount: number; // 미참조 + grace 통과 (실제 삭제 후보)
  eligibleBytes: number;
  byOwner: Record<string, { count: number; bytes: number; oldest: string; newest: string }>;
  eligible: OrphanObject[];
  aborted: string | null; // 안전장치가 걸리면 사유, 아니면 null
}

function toOrphan(o: BucketObject): OrphanObject {
  return { path: o.path, ownerId: o.ownerId, createdAt: o.createdAt, sizeBytes: o.sizeBytes };
}

async function referencedPaths(): Promise<Set<string>> {
  const rows = await prisma.diaryImage.findMany({ select: { storagePath: true } });
  return new Set(rows.map((r) => r.storagePath));
}

/**
 * 버킷을 스캔해 삭제 후보(고아 + grace 통과)를 산출한다. **삭제는 하지 않는다.**
 * @param graceHours 업로드 후 이 시간 이상 지난 고아만 후보에 포함
 * @param nowMs 기준 시각 (Date.now())
 */
export async function scanOrphans(graceHours: number, nowMs: number): Promise<OrphanScan> {
  const objects = await listBucketObjects();
  const referenced = await referencedPaths();

  const base: OrphanScan = {
    scannedObjects: objects.length,
    referencedCount: referenced.size,
    orphanTotal: 0,
    graceHours,
    eligibleCount: 0,
    eligibleBytes: 0,
    byOwner: {},
    eligible: [],
    aborted: null,
  };

  // 🔒 안전장치 2: 객체는 있는데 참조가 0 → DiaryImage 조회가 비정상(빈 결과)일 가능성.
  // 이 상태로 진행하면 전량이 "고아"로 보여 대참사. 중단한다.
  if (objects.length > 0 && referenced.size === 0) {
    return { ...base, aborted: "DiaryImage 참조 0건인데 버킷 객체는 존재 — DB 조회 이상 의심, 중단" };
  }

  const cutoffMs = nowMs - graceHours * 3600_000;
  const unreferenced = objects.filter((o) => !referenced.has(o.path));
  const eligible = unreferenced.filter((o) => {
    const t = Date.parse(o.createdAt);
    return Number.isFinite(t) && t < cutoffMs; // grace 통과: 충분히 오래됨
  });

  const byOwner: OrphanScan["byOwner"] = {};
  let eligibleBytes = 0;
  for (const o of eligible) {
    eligibleBytes += o.sizeBytes;
    const e = (byOwner[o.ownerId] ??= { count: 0, bytes: 0, oldest: o.createdAt, newest: o.createdAt });
    e.count += 1;
    e.bytes += o.sizeBytes;
    if (o.createdAt < e.oldest) e.oldest = o.createdAt;
    if (o.createdAt > e.newest) e.newest = o.createdAt;
  }

  return {
    ...base,
    orphanTotal: unreferenced.length,
    eligibleCount: eligible.length,
    eligibleBytes,
    byOwner,
    eligible: eligible.map(toOrphan),
  };
}

/**
 * 스캔 결과의 후보를 실제로 삭제한다(best-effort). 호출 직전 DiaryImage를 **다시 조회해**
 * 그 사이 저장된 사진이 후보에 섞이지 않도록 재대조한다(🔒 안전장치 3).
 * @returns 삭제 요청한 경로 수 (deleteImages는 best-effort라 실패분은 로그로만 남음)
 */
export async function deleteOrphans(scan: OrphanScan): Promise<{ requested: number; skippedNowReferenced: number }> {
  if (scan.aborted) return { requested: 0, skippedNowReferenced: 0 };
  const referenced = await referencedPaths();
  const candidate = scan.eligible.map((o) => o.path);
  const toDelete = candidate.filter((p) => !referenced.has(p));
  const skipped = candidate.length - toDelete.length;
  if (skipped > 0) {
    console.warn(`[gc-orphans] ${skipped}건이 스캔 후 저장됨 → 삭제 제외`);
  }
  await deleteImages(toDelete);
  return { requested: toDelete.length, skippedNowReferenced: skipped };
}
