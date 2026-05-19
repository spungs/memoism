import "server-only";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

// 베타 cap 정책 (마일스톤 ⑦ Phase 5):
//   - FREE: 일 3회 (V2 광고 시청당 +1)
//   - BASIC: 일 10회 (V2 광고 시청당 +N)
//   - PRO: 일 100회 (V2, 안전 cap)
const TIER_LIMITS = {
  FREE: 3,
  BASIC: 10,
  PRO: 100,
} as const;

export type Tier = keyof typeof TIER_LIMITS;

export type CapResult =
  | { allowed: true; remaining: number; tier: Tier }
  | { allowed: false; remaining: 0; tier: Tier; reason: "daily_cap" };

/**
 * 베타 정책 (D-PG 옵션 나): subscriptionStatus = ACTIVE → Basic 자동 부여.
 * V2에서 결제 도입 시 ACTIVE 안에서 Basic/Pro 분리.
 */
function tierOf(status: SubscriptionStatus): Tier {
  return status === "ACTIVE" ? "BASIC" : "FREE";
}

/**
 * KST 자정 기준 DATE.
 * Postgres DATE 컬럼은 timezone-naive라 KST 자정을 UTC로 변환해 저장.
 */
function todayKST(): Date {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()),
  );
}

/**
 * AI 호출 시 cap 검증 + 동시성 안전 카운터 증분.
 *   1. upsert로 date row 보장 (없으면 0으로 생성)
 *   2. updateMany WHERE aiCallCount < limit AND increment (원자적)
 *   3. updateMany.count === 0 이면 cap 도달
 *
 * 동일 사용자가 동시에 N개 호출해도 limit를 절대 초과 안 함.
 */
export async function checkAndIncrement(
  userId: string,
  subscriptionStatus: SubscriptionStatus,
): Promise<CapResult> {
  const tier = tierOf(subscriptionStatus);
  const limit = TIER_LIMITS[tier];
  const date = todayKST();

  return prisma.$transaction(async (tx) => {
    await tx.usageLog.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, aiCallCount: 0 },
      update: {},
    });

    const updated = await tx.usageLog.updateMany({
      where: {
        userId,
        date,
        aiCallCount: { lt: limit },
      },
      data: {
        aiCallCount: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      return { allowed: false, remaining: 0, tier, reason: "daily_cap" };
    }

    const row = await tx.usageLog.findUnique({
      where: { userId_date: { userId, date } },
      select: { aiCallCount: true },
    });
    const used = row?.aiCallCount ?? limit;
    return { allowed: true, remaining: Math.max(0, limit - used), tier };
  });
}

/**
 * 현재 사용량 조회 (cap UI 표시용).
 * - FREE: 항상 표시 ("오늘 X/3")
 * - BASIC: 항상 표시 ("오늘 X/10")
 * - PRO: 도달 시만 안내 (V2)
 */
export async function todayUsage(
  userId: string,
  subscriptionStatus: SubscriptionStatus,
): Promise<{ used: number; limit: number; remaining: number; tier: Tier }> {
  const tier = tierOf(subscriptionStatus);
  const limit = TIER_LIMITS[tier];
  const date = todayKST();

  const row = await prisma.usageLog.findUnique({
    where: { userId_date: { userId, date } },
    select: { aiCallCount: true },
  });
  const used = row?.aiCallCount ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used), tier };
}
