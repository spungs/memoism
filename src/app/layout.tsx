import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/providers/posthog-provider";
import { PageTracker } from "@/components/analytics/page-tracker";
import { TZ_COOKIE } from "@/lib/tz";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "메모이즘",
    template: "%s | 메모이즘",
  },
  description: "스쳐지나가는 일상들을 기록하기 위한 나만의 일기장",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "메모이즘",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 확대를 막지 않는다 — 글자를 키워 보는 사용자를 막는 접근성 미달이었다(점검 L19).
  // 입력칸 포커스 확대는 입력칸을 16px(--text-input)로 두어 막는다.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3F1" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** 첫 페인트 전에 .dark 클래스를 적용해 라이트→다크 플래시를 막는다.
    키·로직은 ThemeToggle(settings)과 동일해야 한다. */
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('memoism-theme');var d=t==='dark'||((!t||t==='auto')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

/** 기기 시간대를 쿠키로 서버에 알린다 — 해외에서도 "오늘"·새벽 규칙·사진 날짜를 현지
    기준으로 정하려고(src/lib/tz.ts). 첫 페인트 전에 심어 이후 모든 요청에 실리게 하고,
    여행 중 앱이 백그라운드에서 돌아올 때(시간대가 바뀌었을 수 있다) 다시 확인한다. */
const TZ_INIT_SCRIPT = `(function(){function s(){try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(!z)return;var c='${TZ_COOKIE}='+encodeURIComponent(z);if(document.cookie.split('; ').indexOf(c)<0)document.cookie=c+';path=/;max-age=31536000;samesite=lax';}catch(e){}}s();document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')s();});})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: TZ_INIT_SCRIPT }} />
        <PostHogProvider>
          <div className="app-shell">{children}</div>
          <Suspense fallback={null}>
            <PageTracker />
          </Suspense>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
