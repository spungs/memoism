"use client";

import { useEffect, useState } from "react";

// AI 일일 사용량 표시 — 캡을 소모하는 **비싼 경로(정리·회상)** 횟수다.
// 메이와의 일상 캡처는 캡을 쓰지 않아 여기 잡히지 않는다 (Plan 03 AiPath).
// 마운트 시 + refreshSignal 변경 시 /api/usage를 다시 조회해
// "오늘 AI X/N"을 갱신한다. 캡은 전역(UsageLog)이라 모든 AI 표면에서 같은 값이고,
// AI 동작 후 부모가 refreshSignal을 올리면 최신값으로 갱신된다.
// (표시는 부가 정보 — 조회 실패 시 조용히 아무것도 렌더하지 않는다.)
/** 이 수 이하로 남으면 조용한 자리에서도 알린다. */
const LOW_REMAINING = 3;

export function AiUsageCounter({
  refreshSignal = 0,
  align = "left",
  variant = "always",
}: {
  refreshSignal?: number;
  align?: "left" | "right" | "center";
  /**
   * `always` — AI 정리 버튼 옆처럼 **누르기 전에 잔여를 알아야 하는** 자리.
   * `low-only` — 메이 대화처럼 상시 노출이 대화를 위축시키는 자리. 얼마 안 남았을
   *   때만, 그것도 "몇 번 남았다"로 말한다. 정확한 수치는 설정 > 구독에 늘 있다.
   */
  variant?: "always" | "low-only";
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

  const remaining = Math.max(0, usage.limit - usage.used);
  // 소진(0)은 입력창이 이미 비활성 + 안내 문구로 말하고 있어 중복이라 띄우지 않는다.
  if (variant === "low-only" && (remaining === 0 || remaining > LOW_REMAINING)) {
    return null;
  }

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
      {variant === "low-only"
        ? // 대화에서 캡을 쓰는 건 회상(질문)뿐이다 — 기록은 무제한이라 "질문"이라 부른다.
          `오늘 질문 ${remaining}번 남았어요`
        : `오늘 AI 정리·회상 ${usage.used}/${usage.limit}`}
    </span>
  );
}
