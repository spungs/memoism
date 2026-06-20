import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { todayUsage } from "@/lib/ai/usage";

// AI 일일 사용량 조회 ("오늘 AI X/N" 표시용). 캡을 소모하지 않는 read-only 조회.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const character = await prisma.character.findUnique({
    where: { userId: session.userId },
    select: { subscriptionStatus: true, plan: true },
  });
  if (!character) {
    return NextResponse.json({ error: "캐릭터를 찾을 수 없어요" }, { status: 404 });
  }
  const u = await todayUsage(
    session.userId,
    character.subscriptionStatus,
    character.plan,
  );
  return NextResponse.json({
    used: u.used,
    limit: u.limit,
    remaining: u.remaining,
    tier: u.tier,
  });
}
