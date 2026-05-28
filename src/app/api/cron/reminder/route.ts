import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sendPushToSubscriptions } from "@/lib/push/web-push";
import { CHARACTER_NAME } from "@/lib/character/utils";

// 22:00 KST 리마인드 Web Push 발송 (NEW-15).
// Supabase pg_cron + pg_net이 매일 13:00 UTC(=22:00 KST)에 이 엔드포인트를 GET 호출하며,
// `Authorization: Bearer ${CRON_SECRET}` 헤더를 보낸다(시크릿은 Supabase Vault에 보관).
// Vercel Hobby cron은 실행 시각 보장이 없어(지연·누락) 트리거를 pg_cron으로 이관함.
//
// 미들웨어는 인증 안 된 /api/* 요청에 401을 반환하므로, 쿠키 없는 이 호출이
// 핸들러까지 도달하도록 src/middleware.ts가 `/api/cron/` 경로를 우회 처리한다.
// 본 핸들러는 CRON_SECRET으로 자체 인증한다.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await prisma.pushSubscription.findMany({
    select: { endpoint: true, p256dh: true, auth: true },
  });

  // 구독 0건이어도 정상 종료.
  const { sent, pruned } = await sendPushToSubscriptions(subs, {
    title: CHARACTER_NAME,
    body: "오늘 하루도 수고했어요. 1분만 남겨볼까요?",
    url: "/diary/new",
  });

  return NextResponse.json({ sent, pruned });
}
