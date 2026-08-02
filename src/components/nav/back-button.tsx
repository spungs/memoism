"use client";

import { useRouter } from "next/navigation";

/**
 * 좌상단 뒤로 — 설정처럼 탭이 아니라 "밀려 올라온" 화면에서 쓴다.
 * 딥링크·PWA 콜드 스타트로 바로 들어오면 되돌아갈 이력이 없다 → 랜딩(/)으로 보낸다.
 */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="뒤로"
      className="pressable"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        minHeight: "var(--touch-target)",
        paddingLeft: 0,
        paddingRight: "var(--space-2)",
        border: "none",
        backgroundColor: "transparent",
        color: "var(--tint)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-md)",
        cursor: "pointer",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="15 18 9 12 15 6" />
      </svg>
      뒤로
    </button>
  );
}
