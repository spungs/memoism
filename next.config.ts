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
  experimental: {
    // Server Action 본문 기본 한도는 1MB라, 일기 편집에서 압축 사진(장당 ~1MB,
    // 최대 10장)을 직접 첨부해 저장하면 초과돼 요청이 거부됐다("저장 중 문제").
    // Vercel 함수 본문 천장(4.5MB) 아래로 올려 여러 장 첨부를 허용한다.
    // (V2: 직접 저장 경로도 AI검토처럼 사진을 스토리지에 선업로드해 본문을 비우면 천장 자체를 우회)
    serverActions: { bodySizeLimit: "4mb" },
  },
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
