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
        gap: "var(--space-4)",
        padding: "var(--space-8) var(--space-5)",
        backgroundColor: "var(--bg)",
        textAlign: "center",
      }}
    >
      <span aria-hidden style={{ fontSize: 32, lineHeight: 1 }}>
        🌧️
      </span>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-lg)",
          fontWeight: 600,
          color: "var(--fg)",
          margin: 0,
        }}
      >
        잠시 문제가 생겼어요
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--fg-muted)",
          margin: 0,
          lineHeight: "var(--leading-relaxed)",
          maxWidth: 320,
        }}
      >
        화면을 불러오는 중 오류가 났어요. 저장된 일기는 그대로 있어요.
        <br />
        다시 시도해주세요.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-md)",
          fontWeight: 600,
          color: "var(--bg)",
          backgroundColor: "var(--fg)",
          border: "none",
          borderRadius: "var(--radius-md)",
          padding: "10px 24px",
          cursor: "pointer",
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
