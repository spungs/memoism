import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { pushSubscriptionSchema } from "@/lib/push/schemas";
import { unauthorized } from "@/lib/auth/unauthorized";

// 사용자당 구독 상한. 한 사람이 쓰는 기기·브라우저 수로 넉넉하다. 상한이 없으면
// 수천 개를 등록해 리마인드 cron 한 번이 그만큼 요청을 보내게 할 수 있었다(점검 M19).
const MAX_SUBSCRIPTIONS_PER_USER = 10;

// Web Push 구독 등록 (NEW-15). 클라이언트가 pushManager.subscribe() 결과를 POST.
// endpoint 기준 upsert — 같은 기기/브라우저가 재구독해도 행이 중복되지 않는다.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return unauthorized();
  }

  const body = await req.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 구독 정보예요" },
      { status: 400 },
    );
  }

  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      // 동일 endpoint가 다른 계정으로 재구독될 수 있으니 소유자/키를 갱신.
      userId: session.userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  // 상한을 넘으면 오래된 구독부터 지운다. 거절하면 새로 쓰기 시작한 기기에 알림이
  // 안 가고, 오래된 구독은 대개 이미 안 쓰는 기기다.
  const overflow = await prisma.pushSubscription.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_SUBSCRIPTIONS_PER_USER,
    select: { id: true },
  });
  if (overflow.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: overflow.map((s) => s.id) } },
    });
  }

  return NextResponse.json({ ok: true });
}
