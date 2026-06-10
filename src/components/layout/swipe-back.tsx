"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// 왼쪽 가장자리 발동 구역(px). 이 안에서 시작한 가로 드래그만 스와이프 백으로 잡는다.
// 가운데에서 시작하는 달력 월-스와이프·캐러셀 가로 스크롤과 원천 분리된다.
const EDGE_PX = 24;
const COMMIT_RATIO = 0.35; // 화면 너비의 이만큼 끌면 뒤로가기 확정
const FLICK_PX = 70; // 빠른 플릭 최소 거리
const FLICK_MS = 300; // 플릭 판정 시간
const DIR_LOCK_PX = 8; // 방향(가로/세로) 확정 임계값

// 탭 루트 — "뒤로"가 모호하므로 스와이프 백 비활성 (상세/작성/검토/수정에만 적용)
const ROOTS = new Set(["/", "/diary", "/character", "/settings"]);

/**
 * iOS 엣지 스와이프 백 근사 — 왼쪽 끝에서 끌면 현재 화면이 손가락을 따라 밀리고,
 * 임계값을 넘기면 router.back(), 덜 끌면 제자리로 튕긴다(스냅백).
 * 뒤 화면 패럴랙스 peek은 App Router 한계로 생략하고, 슬라이드 페이지의 왼쪽
 * 그림자로 "들려서 밀린다"는 깊이감만 준다.
 * touchmove는 non-passive로 직접 등록해 가로 드래그 확정 시 preventDefault(세로
 * 스크롤·브라우저 기본 제스처 차단). prefers-reduced-motion은 transition만 짧아져
 * 동작 자체는 유지(접근성상 내비게이션은 막지 않음).
 */
export function SwipeBack({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const enabled = !ROOTS.has(pathname);

  const ref = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let sx = 0;
    let sy = 0;
    let st = 0;
    let dragging = false;
    let armed = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || t.clientX > EDGE_PX) return; // 가장자리에서 시작한 터치만
      armed = true;
      dragging = false;
      sx = t.clientX;
      sy = t.clientY;
      st = e.timeStamp;
      setAnimating(false);
    };

    const onMove = (e: TouchEvent) => {
      if (!armed) return;
      const t = e.touches[0];
      if (!t) return;
      const ddx = t.clientX - sx;
      const ddy = t.clientY - sy;
      if (!dragging) {
        // 세로가 우세하면 스크롤 의도 → 취소(스크롤 방해 안 함)
        if (Math.abs(ddy) > Math.abs(ddx)) {
          armed = false;
          return;
        }
        if (ddx > DIR_LOCK_PX) dragging = true;
        else return;
      }
      if (e.cancelable) e.preventDefault();
      setDx(Math.max(0, ddx));
    };

    const onEnd = (e: TouchEvent) => {
      if (!dragging) {
        armed = false;
        return;
      }
      const w = window.innerWidth || 390;
      const dist = Math.max(0, (e.changedTouches[0]?.clientX ?? sx) - sx);
      const commit =
        dist > w * COMMIT_RATIO ||
        (dist > FLICK_PX && e.timeStamp - st < FLICK_MS);
      armed = false;
      dragging = false;
      setAnimating(true);
      if (commit) {
        setDx(w); // 오른쪽으로 완전히 밀어내고
        window.setTimeout(() => router.back(), 220); // 뒤로
      } else {
        setDx(0); // 스냅백
      }
    };

    const onCancel = () => {
      armed = false;
      dragging = false;
      setAnimating(true);
      setDx(0);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [enabled, router]);

  if (!enabled) return <>{children}</>;

  return (
    <div
      ref={ref}
      style={{
        transform: dx > 0 ? `translateX(${dx}px)` : undefined,
        transition: animating ? "transform 260ms var(--ease-soft)" : "none",
        boxShadow: dx > 0 ? "-12px 0 32px rgba(0,0,0,0.16)" : undefined,
        minHeight: "100svh",
        backgroundColor: "var(--bg)",
      }}
    >
      {children}
    </div>
  );
}
