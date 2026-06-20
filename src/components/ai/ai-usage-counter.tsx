"use client";

import { useEffect, useState } from "react";

// AI 일일 사용량 표시 — 마운트 시 + refreshSignal 변경 시 /api/usage를 다시 조회해
// "오늘 AI X/N"을 갱신한다. 캡은 전역(UsageLog)이라 모든 AI 표면에서 같은 값이고,
// AI 동작 후 부모가 refreshSignal을 올리면 최신값으로 갱신된다.
// (표시는 부가 정보 — 조회 실패 시 조용히 아무것도 렌더하지 않는다.)
export function AiUsageCounter({
  refreshSignal = 0,
  align = "left",
}: {
  refreshSignal?: number;
  align?: "left" | "right" | "center";
}) {
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && typeof d.used === "number") {
          setUsage({ used: d.used, limit: d.limit });
        }
      })
      .catch(() => {
        /* 부가 정보라 실패 무시 */
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  if (!usage) return null;

  return (
    <span
      style={{
        display: "block",
        textAlign: align,
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        color: "var(--fg-placeholder)",
      }}
    >
      오늘 AI {usage.used}/{usage.limit}
    </span>
  );
}
