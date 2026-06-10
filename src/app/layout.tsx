import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PostHogProvider } from "@/providers/posthog-provider";
import { PageTracker } from "@/components/analytics/page-tracker";
import { QueryProvider } from "@/providers/query-provider";
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3F1" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** 첫 페인트 전에 .dark 클래스를 적용해 라이트→다크 플래시를 막는다.
    키·로직은 ThemeToggle(settings)과 동일해야 한다. */
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('memoism-theme');var d=t==='dark'||((!t||t==='auto')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <PostHogProvider>
          <QueryProvider>
            <div className="app-shell">{children}</div>
          </QueryProvider>
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
