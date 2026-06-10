"use client";

// 보호 라우트(홈·일기·상세·설정 등)에서 렌더 중 예외가 나면 빈 화면 대신 이 복구 화면을 보여준다.
// 이게 없으면 어떤 일시적 오류든 Next 기본 폴백("Application error: a client-side
// exception has occurred")으로 떨어져 사용자가 막다른 빈 화면을 만난다.
import { useEffect } from "react";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "calc(100svh - 56px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        padding: "var(--space-8) var(--space-5)",
        backgroundColor: "var(--bg)",
        textAlign: "center",
      }}
    >
      {/* 아이콘 — tertiary 알파로 후퇴 */}
      <svg
        aria-hidden
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--fg-placeholder)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-md)",
          fontWeight: 600,
          color: "var(--fg)",
          margin: 0,
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        잠시 문제가 생겼어요
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-base)",
          color: "var(--fg-muted)",
          margin: 0,
          lineHeight: "var(--leading-relaxed)",
          maxWidth: 280,
        }}
      >
        저장된 일기는 그대로 있어요.
        <br />
        잠시 후 다시 시도해주세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="pressable"
        style={{
          marginTop: "var(--space-2)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-base)",
          fontWeight: 600,
          color: "var(--tint)",
          backgroundColor: "var(--tint-soft)",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "0 var(--space-6)",
          height: 44,
          cursor: "pointer",
          minWidth: 120,
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
