"use client";

import { useEffect, useState } from "react";

/**
 * 문서 스크롤 여부 (threshold px 초과 시 true).
 * 글래스 바가 콘텐츠 위에 떠 있을 때 재질을 진하게 — iOS 26 Liquid Glass의
 * "콘텐츠에 반응하는 재질"을 저비용으로 근사한다 (.glass.is-scrolled).
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
