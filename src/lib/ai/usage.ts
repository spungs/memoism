import "server-only";
import { SubscriptionStatus, SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/db";

// 일일 AI 호출 cap — plan(요금제 티어)으로 결정 (마일스톤 ⑦ Phase 5):
//   - FREE: 일 3회 / BASIC: 일 10회 / PRO: 일 100회
const TIER_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 3,
  BASIC: 10,
  PRO: 100,
};

export type Tier = SubscriptionPlan;

export type CapResult =
  | { allowed: true; remaining: number; tier: Tier }
  | { allowed: false; remaining: 0; tier: Tier; reason: "daily_cap" };

/**
 * 실효 티어 = 구독이 유효(ACTIVE/TRIAL)할 때만 plan 적용, 아니면 FREE로 강등.
 * (만료·미구독은 무료 한도. 결제 도입 전 베타는 전원 ACTIVE+BASIC.)
 */
function effectiveTier(
  status: SubscriptionStatus,
  plan: SubscriptionPlan,
): Tier {
  const active = status === "ACTIVE" || status === "TRIAL";
  return active ? plan : "FREE";
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
  plan: SubscriptionPlan,
): Promise<CapResult> {
  const tier = effectiveTier(subscriptionStatus, plan);
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
  plan: SubscriptionPlan,
): Promise<{ used: number; limit: number; remaining: number; tier: Tier }> {
  const tier = effectiveTier(subscriptionStatus, plan);
  const limit = TIER_LIMITS[tier];
  const date = todayKST();

  const row = await prisma.usageLog.findUnique({
    where: { userId_date: { userId, date } },
    select: { aiCallCount: true },
  });
  const used = row?.aiCallCount ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used), tier };
}
