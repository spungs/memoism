"use client";

// 루트 레이아웃 단계까지 올라온 치명적 예외의 최후 폴백. global-error는 자체 <html>/<body>를
// 렌더해야 하고 globals.css가 안 실릴 수 있어 색은 디자인 토큰 값을 하드코딩한다(paper/ink).
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
          gap: 16,
          padding: "48px 20px",
          backgroundColor: "#FBF6EC",
          color: "#2A2118",
          textAlign: "center",
          fontFamily:
            "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        <span aria-hidden style={{ fontSize: 32, lineHeight: 1 }}>
          🌧️
        </span>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          잠시 문제가 생겼어요
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#4A3D2E",
            margin: 0,
            lineHeight: 1.7,
            maxWidth: 320,
          }}
        >
          예기치 못한 오류가 났어요. 저장된 일기는 그대로 있어요.
          <br />
          다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#FBF6EC",
            backgroundColor: "#2A2118",
            border: "none",
            borderRadius: 10,
            padding: "10px 24px",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
