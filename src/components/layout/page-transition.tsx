"use client";

import { usePathname } from "next/navigation";

/**
 * 라우트가 바뀔 때마다 본문을 살짝 떠오르며 페이드 인 — 네이티브 push 전환 근사.
 * pathname을 key로 줘 페이지 세그먼트가 교체될 때 .page-enter 애니메이션이 재생된다.
 * 탭바·고정 헤더는 이 래퍼 밖이라 함께 움직이지 않는다(네이티브 탭바처럼 고정).
 * prefers-reduced-motion에서는 globals.css 전역 규칙이 애니메이션을 자동 비활성화한다.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
