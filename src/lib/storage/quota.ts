import "server-only";
import { prisma } from "@/lib/db";
import { effectiveTier, type Tier } from "@/lib/ai/usage";

const MB = 1024 * 1024;
const GB = 1024 * MB;

// 임시 placeholder — 스토리지는 주 paywall이 아니라 넉넉한 어뷰즈 가드다.
// 실제 비용은 AI(Gemini)가 지배하고, 스토리지 at-rest는 저렴(~250KB/장). 가격 확정 시 조정.
export const TIER_STORAGE_BYTES: Record<Tier, number> = {
  FREE: 2 * GB, // ≈ 8,000장
  BASIC: 20 * GB,
  PRO: 200 * GB,
};

/** 순수: 추가 후 쿼터 초과 여부. */
export function exceedsQuota(
  used: number,
  add: number,
  limit: number,
): boolean {
  return used + add > limit;
}

/** 현재 사용량·한도·티어. */
export async function getStorageQuota(
  userId: string,
): Promise<{ used: number; limit: number; tier: Tier }> {
  const c = await prisma.character.findUnique({
    where: { userId },
    select: { subscriptionStatus: true, plan: true, storageUsedBytes: true },
  });
  if (!c) throw new Error("character 없음");
  const tier = effectiveTier(c.subscriptionStatus, c.plan);
  return {
    // 캐시가 음수로 드리프트하면(백필로 sizeBytes만 채워진 중간 상태에서 삭제 등)
    // 0으로 본다 — 게이트를 느슨한 쪽으로 실패시키고, 정확한 값은 백필이 재계산한다.
    used: Math.max(0, Number(c.storageUsedBytes)),
    limit: TIER_STORAGE_BYTES[tier],
    tier,
  };
}

/** 업로드 전 사전검증. addBytes 추가 시 초과면 ok:false. */
export async function assertStorageQuota(
  userId: string,
  addBytes: number,
): Promise<{ ok: true } | { ok: false; used: number; limit: number }> {
  const { used, limit } = await getStorageQuota(userId);
  return exceedsQuota(used, addBytes, limit)
    ? { ok: false, used, limit }
    : { ok: true };
}
