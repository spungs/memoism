"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const fullDateFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  max: string;   // YYYY-MM-DD (today)
  onChange: (value: string) => void;
}

export function DiaryDatePicker({ value, max, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => Number(value.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(value.slice(5, 7)) - 1);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxYear = Number(max.slice(0, 4));
  const maxMonth = Number(max.slice(5, 7)) - 1;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  const goPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const canGoNext = viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth);
  const goNext = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const toDateStr = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (day: number) => {
    const ds = toDateStr(day);
    if (ds > max) return;
    onChange(ds);
    setOpen(false);
  };

  const isSelected = (day: number) => toDateStr(day) === value;
  const isToday   = (day: number) => toDateStr(day) === max;
  const isFuture  = (day: number) => toDateStr(day) > max;

  const label = fullDateFmt.format(new Date(value + "T12:00:00"));
  const isModified = value !== max;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pressable"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: isModified ? "var(--tint)" : "var(--fg-muted)",
          letterSpacing: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 100,
            width: 288,
            backgroundColor: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-lg)",
            padding: "16px",
          }}
        >
          {/* Month navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button
              type="button"
              onClick={goPrev}
              style={navBtnStyle}
            >
              ‹
            </button>
            <span style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--fg)",
            }}>
              {viewYear}년 {viewMonth + 1}월
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              style={{ ...navBtnStyle, opacity: canGoNext ? 1 : 0.25 }}
            >
              ›
            </button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                fontWeight: 500,
                color: i === 0 ? "var(--danger)" : i === 6 ? "var(--mood-calm)" : "var(--fg-placeholder)",
                letterSpacing: 0,
                paddingBottom: 6,
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const future = isFuture(day);
              const selected = isSelected(day);
              const todayCell = isToday(day);
              const col = i % 7; // 0=일, 6=토
              const weekendColor = col === 0 ? "var(--danger)" : col === 6 ? "var(--mood-calm)" : "var(--fg)";

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !future && selectDay(day)}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    fontWeight: selected ? 700 : todayCell ? 600 : 400,
                    color: selected
                      ? "var(--on-tint)"
                      : future
                      ? "var(--fg-placeholder)"
                      : todayCell
                      ? "var(--tint)"
                      : weekendColor,
                    backgroundColor: selected
                      ? "var(--tint)"
                      : "transparent",
                    border: "none",
                    borderRadius: "var(--radius-pill)",
                    cursor: future ? "default" : "pointer",
                    transition: "background-color var(--duration-fast) var(--ease-out)",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* 오늘 버튼 */}
          <div style={{ marginTop: 10, borderTop: "1px solid var(--separator)", paddingTop: 10, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => {
                onChange(max);
                setViewYear(maxYear);
                setViewMonth(maxMonth);
                setOpen(false);
              }}
              className="pressable"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: value === max ? "var(--fg-subtle)" : "var(--tint)",
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: 0,
              }}
            >
              오늘로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-sans)",
  fontSize: 20,
  lineHeight: 1,
  color: "var(--fg-muted)",
  background: "none",
  border: "none",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
};
