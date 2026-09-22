"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";

/**
 * 월 바의 "2026년 9월"을 탭하면 열리는 연·월 점프 시트.
 *
 * 없을 때는 먼 과거로 가려면 ‹ 를 그 횟수만큼 눌러야 했다 — 5월 기록을 보려고
 * 9월에서 네 번, 작년이면 열 번이 넘는다. 캘린더의 가장 흔한 동작이 가장 비싼
 * 동작이었다.
 *
 * 연도는 시트 안에서만 바뀐다(`draftYear`). 고르지 않고 닫으면 원래 달로
 * 돌아와야 하므로 부모 상태를 건드리지 않는다 — 연도만 넘겨보다 닫았는데
 * 달력이 딴 해로 가 있으면 길을 잃는다.
 *
 * 부모는 이 컴포넌트를 **열려 있을 때만 렌더**한다. 그래야 닫았다 다시 열 때
 * `draftYear`가 지금 보는 달의 연도에서 다시 시작한다(useState 초기값은 마운트
 * 때 한 번만 잡히므로, 계속 붙여두면 지난번에 넘겨본 연도가 남는다).
 */
export function MonthPickerSheet({
  year,
  month,
  todayYear,
  todayMonth,
  onPick,
  onClose,
}: {
  /** 지금 보고 있는 달 */
  year: number;
  month: number;
  todayYear: number;
  todayMonth: number;
  onPick: (year: number, month: number) => void;
  onClose: () => void;
}) {
  const [draftYear, setDraftYear] = useState(year);
  const isFutureYear = draftYear >= todayYear;

  return (
    <BottomSheet isOpen onClose={onClose}>
      <div style={{ padding: "var(--space-4) var(--space-5) var(--space-5)" }}>
        {/* 연도 네비 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-4)",
            marginBottom: "var(--space-4)",
          }}
        >
          <button
            type="button"
            className="pressable"
            onClick={() => setDraftYear(draftYear - 1)}
            aria-label="이전 해"
            style={yearNavBtn}
          >
            ‹
          </button>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--fg)",
              minWidth: 86,
              textAlign: "center",
            }}
          >
            {draftYear}년
          </span>
          <button
            type="button"
            className="pressable"
            onClick={() => setDraftYear(draftYear + 1)}
            aria-label="다음 해"
            // 미래로는 넘어가도 달이 전부 잠겨 있어 의미가 없다 — 아예 막는다.
            disabled={isFutureYear}
            style={{
              ...yearNavBtn,
              opacity: isFutureYear ? 0.25 : 1,
              cursor: isFutureYear ? "default" : "pointer",
            }}
          >
            ›
          </button>
        </div>

        {/* 12개월 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-2)",
          }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const isFuture =
              draftYear > todayYear ||
              (draftYear === todayYear && m > todayMonth);
            const isCurrent = draftYear === year && m === month;
            const isToday = draftYear === todayYear && m === todayMonth;
            return (
              <button
                key={m}
                type="button"
                className="pressable"
                onClick={() => onPick(draftYear, m)}
                disabled={isFuture}
                aria-current={isCurrent ? "true" : undefined}
                style={{
                  minHeight: 48,
                  borderRadius: "var(--radius-md)",
                  border: isToday && !isCurrent
                    ? "1px solid var(--separator)"
                    : "1px solid transparent",
                  backgroundColor: isCurrent ? "var(--fg)" : "var(--fill-secondary)",
                  color: isCurrent
                    ? "var(--bg)"
                    : isFuture
                      ? "var(--fg-placeholder)"
                      : "var(--fg)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-md)",
                  fontWeight: isCurrent ? 600 : 500,
                  opacity: isFuture ? 0.4 : 1,
                  cursor: isFuture ? "default" : "pointer",
                }}
              >
                {m}월
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="pressable"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: 50,
            marginTop: "var(--space-4)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: "var(--fill-secondary)",
            color: "var(--fg)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          닫기
        </button>
      </div>
    </BottomSheet>
  );
}

const yearNavBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--radius-pill)",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--fg-muted)",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
};
