"use client";

// 루트 레이아웃 단계까지 올라온 치명적 예외의 최후 폴백. global-error는 자체 <html>/<body>를
// 렌더해야 하고 globals.css가 안 실릴 수 있어 색은 디자인 토큰 값을 하드코딩한다.
// Apple Edition v2 팔레트 기준 — bg:#F4F3F1 / fg:#1C1B1A / tint:#D65745
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "48px 20px",
          backgroundColor: "#F4F3F1",
          color: "#1C1B1A",
          textAlign: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Pretendard', 'Apple SD Gothic Neo', system-ui, sans-serif",
        }}
      >
        {/* 아이콘 — tertiary rgba(60,56,50,0.34) */}
        <svg
          aria-hidden
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(60,56,50,0.34)"
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
            fontSize: 17,
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          잠시 문제가 생겼어요
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "rgba(60,56,50,0.62)",
            margin: 0,
            lineHeight: 1.7,
            maxWidth: 280,
          }}
        >
          예기치 못한 오류가 났어요. 저장된 일기는 그대로 있어요.
          <br />
          잠시 후 다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 8,
            fontSize: 15,
            fontWeight: 600,
            color: "#D65745",
            backgroundColor: "rgba(214,87,69,0.11)",
            border: "none",
            borderRadius: 12,
            padding: "0 24px",
            height: 44,
            cursor: "pointer",
            minWidth: 120,
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
