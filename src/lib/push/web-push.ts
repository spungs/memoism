import webpush from "web-push";
import { prisma } from "@/lib/db";

// Web Push 발송 래퍼 (NEW-15 — 22:00 KST 리마인드).
//
// 주의: PWA service worker는 dev에서 비활성(next.config.ts `disable: true`)이라
// 실제 푸시는 prod 빌드에서만 동작한다. 여기 발송 로직 자체는 환경 무관하게 실행되나,
// 구독이 생성되려면 prod에서 service worker가 등록돼 있어야 한다.

// VAPID 초기화는 모듈 로드 시 1회. env가 없으면 throw하지 않고 플래그만 내려서
// (예: 로컬에서 키 미설정) import만으로 앱이 죽지 않게 한다 — 실제 발송 시 가드.
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

let vapidConfigured = false;
if (VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
} else {
  console.warn(
    "[web-push] VAPID 환경변수가 설정되지 않아 푸시 발송이 비활성화됩니다 " +
      "(VAPID_SUBJECT / NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 확인).",
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// DB의 PushSubscription 행을 web-push가 기대하는 형태로 변환하기 위한 최소 형태.
export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendResult {
  sent: number;
  pruned: number;
}

// 만료된 구독을 의미하는 HTTP 상태코드.
const EXPIRED_STATUS = new Set([404, 410]);

/**
 * 주어진 구독들에 동일 payload를 병렬 발송한다.
 * - 404/410(만료) 응답은 해당 PushSubscription 행을 DB에서 prune.
 * - 그 외 에러는 로깅만 하고 무시(다음 발송에서 자연 정리되거나 일시적 오류).
 */
export async function sendPushToSubscriptions(
  subs: StoredSubscription[],
  payload: PushPayload,
): Promise<SendResult> {
  if (!vapidConfigured) {
    console.warn("[web-push] VAPID 미설정으로 발송을 건너뜁니다.");
    return { sent: 0, pruned: 0 };
  }

  const body = JSON.stringify(payload);
  const expiredEndpoints: string[] = [];
  let sent = 0;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
      ),
    ),
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent += 1;
      return;
    }
    const reason = result.reason as { statusCode?: number; message?: string };
    const status = reason?.statusCode;
    if (typeof status === "number" && EXPIRED_STATUS.has(status)) {
      expiredEndpoints.push(subs[i].endpoint);
    } else {
      console.error(
        "[web-push] 발송 실패:",
        status ?? "",
        reason?.message ?? reason,
      );
    }
  });

  let pruned = 0;
  if (expiredEndpoints.length > 0) {
    const res = await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
    pruned = res.count;
  }

  return { sent, pruned };
}

/**
 * 특정 사용자의 모든 구독에 발송. 만료 구독 prune 포함.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<SendResult> {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, auth: true },
  });
  return sendPushToSubscriptions(subs, payload);
}
