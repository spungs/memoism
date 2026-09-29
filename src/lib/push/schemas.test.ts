import { describe, expect, it } from "vitest";
import { isPushServiceEndpoint, pushSubscriptionSchema } from "./schemas";

describe("isPushServiceEndpoint (점검 M19)", () => {
  it("브라우저 푸시 서비스 주소는 받는다", () => {
    for (const url of [
      "https://web.push.apple.com/QGJ-abc", // 운영에 실제로 있는 형태
      "https://fcm.googleapis.com/fcm/send/abc:def",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      expect(isPushServiceEndpoint(url), url).toBe(true);
    }
  });

  it("http·내부 호스트·비슷하게 생긴 도메인은 거절한다", () => {
    for (const url of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://169.254.169.254/latest/meta-data",
      "https://localhost:3000/x",
      "https://evil.com/fcm.googleapis.com",
      "https://fcm.googleapis.com.evil.com/x",
      "https://notpush.apple.com.evil.com/x",
      "not a url",
    ]) {
      expect(isPushServiceEndpoint(url), url).toBe(false);
    }
  });

  it("구독 스키마가 거절 사유를 한국어로 준다", () => {
    const r = pushSubscriptionSchema.safeParse({
      endpoint: "https://example.com/push",
      keys: { p256dh: "a", auth: "b" },
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("이 브라우저의 알림 주소는 지원하지 않아요");
  });
});
