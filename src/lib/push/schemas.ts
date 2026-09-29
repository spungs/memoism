import { z } from "zod";

// 브라우저 푸시 서비스 호스트. 아무 URL이나 받으면 매일 리마인드 cron이 그 주소로
// 서버발 요청을 보낸다 — http·내부 호스트까지 들어갔다(점검 M19).
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome·Samsung·Opera 등
  /^android\.googleapis\.com$/, // 옛 GCM 주소
  /(^|\.)push\.apple\.com$/, // Safari·iOS (web.push.apple.com)
  /(^|\.)push\.services\.mozilla\.com$/, // Firefox
  /(^|\.)notify\.windows\.com$/, // Edge (Windows, wns2-*.notify.windows.com)
];

export function isPushServiceEndpoint(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    PUSH_SERVICE_HOSTS.some((re) => re.test(url.hostname))
  );
}

// 브라우저 PushManager.subscribe()가 반환하는 표준 PushSubscription JSON 형태.
export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url("올바른 엔드포인트가 아니에요")
    .refine(isPushServiceEndpoint, "이 브라우저의 알림 주소는 지원하지 않아요"),
  keys: z.object({
    p256dh: z.string().min(1, "구독 키가 누락됐어요"),
    auth: z.string().min(1, "구독 키가 누락됐어요"),
  }),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().url("올바른 엔드포인트가 아니에요"),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;
