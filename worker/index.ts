/// <reference lib="webworker" />

// Custom service worker (@ducanh2912/next-pwa).
// next.config.ts의 customWorkerSrc("worker")로 자동 컴파일돼 생성된 sw.js에 import된다.
// dev에선 PWA가 비활성(next.config.ts `disable: true`)이라 이 워커는 prod 빌드에서만 동작한다.
//
// 참고: 프로젝트 tsconfig가 "dom" lib을 포함하고 worker/도 include에 잡히므로,
// `declare const self`로 전역을 재선언하면 dom의 `self`와 충돌한다. 충돌을 피하려고
// 전역 재선언 대신 service worker 스코프로 단일 캐스팅한 별칭(sw)을 쓴다.
const sw = self as unknown as ServiceWorkerGlobalScope;

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

sw.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload;
  try {
    payload = event.data?.json() as PushPayload;
  } catch {
    payload = { title: "메이", body: "오늘 하루도 수고했어요." };
  }

  const { title, body, url } = payload;

  event.waitUntil(
    sw.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: url ?? "/" },
    }),
  );
});

sw.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url =
    (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    (async () => {
      // 이미 열린 탭이 있으면 거기로 포커스, 없으면 새 창.
      const allClients = await sw.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        await client.focus();
        await client.navigate(url);
        return;
      }
      await sw.clients.openWindow(url);
    })(),
  );
});
