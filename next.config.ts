import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // 프론트 네비게이션 선제 캐싱은 끔 — 배포 후 옛 RSC/청크를 붙들어 빈 화면을
  // 유발했다. 기본 runtimeCaching이 pages/rsc를 NetworkFirst(온라인=항상 최신)로
  // 처리하고 skipWaiting·clientsClaim·cleanupOutdatedCaches가 기본 true라
  // 새 SW가 즉시 인계되고 옛 캐시는 자동 정리된다.
  reloadOnOnline: true,
  // Web Push 핸들러(worker/index.ts)를 sw.js에 import (NEW-15).
  // 기본값과 동일하지만 의도를 명시. dev에선 disable:true라 push는 prod 빌드에서만 동작.
  customWorkerSrc: "worker",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default withPWA(nextConfig);
