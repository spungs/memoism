import { z } from "zod";

// 브라우저 PushManager.subscribe()가 반환하는 표준 PushSubscription JSON 형태.
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("올바른 엔드포인트가 아니에요"),
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
