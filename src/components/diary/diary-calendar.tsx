"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { MoodBadge } from "./mood-badge";
import { MOODS, KNOWN_MOOD_KEYS } from "./mood-data";
import { kstTodayKey } from "@/lib/diary/kst";
import type { CalendarEntry } from "@/lib/diary/queries";

interface Props {
  initialYear: number;
  initialMonth: number; // 1~12
  initialDays: Record<string, CalendarEntry[]>;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const NEUTRAL_DOT = "var(--ink-4)";
const MOOD_DOT_COLOR: Record<string, string> = Object.fromEntries(
  MOODS.map((m) => [m.key, m.color]),
);

function cellKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function ym(y: number, m: number): number {
  return y * 12 + (m - 1);
}
function buildCells(y: number, m: number): (number | null)[] {
  const firstWeekday = new Date(y, m - 1, 1).getDay(); // 0=일
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function dotColor(entry: CalendarEntry): string {
  return entry.mood && KNOWN_MOOD_KEYS.has(entry.mood)
    ? MOOD_DOT_COLOR[entry.mood]
    : NEUTRAL_DOT;
}
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function snippet(content: string, n = 40): string {
  const t = content.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}
function sheetDateLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 ${wd}요일`;
}

export function DiaryCalendar({ initialYear, initialMonth, initialDays }: Props) {
  const router = useRouter();
  const todayKey = kstTodayKey();
  const [ty, tm] = todayKey.split("-").map(Number);
  const todayYm = ym(ty, tm);

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState(initialDays);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const reqRef = useRef(0);
  const touchX = useRef<number | null>(null);

  const canGoNext = ym(year, month) < todayYm;

  async function loadMonth(y: number, m: number) {
    setYear(y);
    setMonth(m);
    setError(null);
    setLoading(true);
    const reqId = ++reqRef.current;
    try {
      const res = await fetch(
        `/api/diaries/calendar?month=${y}-${String(m).padStart(2, "0")}`,
      );
      const data = await res.json();
      if (reqId !== reqRef.current) return; // 연타 시 stale 응답 무시
      if (!res.ok) {
        setError(data?.error ?? "표식을 불러오지 못했어요");
        return;
      }
      setDays(data.days);
    } catch {
      if (reqId === reqRef.current) setError("표식을 불러오지 못했어요");
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }

  function goPrev() {
    const d = new Date(year, month - 2, 1);
    void loadMonth(d.getFullYear(), d.getMonth() + 1);
  }
  function goNext() {
    if (!canGoNext) return;
    const d = new Date(year, month, 1);
    void loadMonth(d.getFullYear(), d.getMonth() + 1);
  }
  function goToday() {
    if (ty === year && tm === month) return;
    void loadMonth(ty, tm);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  function onDayTap(day: number) {
    const key = cellKey(year, month, day);
    if (key > todayKey) return; // 미래
    const entries = days[key];
    if (!entries || entries.length === 0) {
      router.push(`/diary/new?date=${key}`);
      return;
    }
    setOpenDate(key);
  }

  const cells = buildCells(year, month);
  const openEntries = openDate ? days[openDate] ?? [] : [];

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ userSelect: "none" }}>
      {/* 월 네비 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-4)",
        }}
      >
        <button type="button" onClick={goPrev} aria-label="이전 달" style={navBtn}>‹</button>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            color: "var(--fg)",
          }}
        >
          {year}년 {month}월
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <button
            type="button"
            onClick={goToday}
            style={{
              ...todayBtn,
              color: ym(year, month) === todayYm ? "var(--fg-subtle)" : "var(--accent-rose)",
            }}
          >
            오늘
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="다음 달"
            disabled={!canGoNext}
            style={{ ...navBtn, opacity: canGoNext ? 1 : 0.25, cursor: canGoNext ? "pointer" : "default" }}
          >
            ›
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "var(--space-2)" }}>
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            style={{
              textAlign: "center",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "var(--tracking-wider)",
              color: i === 0 ? "var(--danger)" : i === 6 ? "#4a90d9" : "var(--fg-subtle)",
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* 그리드 */}
      <div role="grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-1)" }}>
        {cells.map((day, i) => {
          if (day == null) return <div key={`b${i}`} />;
          const key = cellKey(year, month, day);
          const entries = days[key] ?? [];
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const aria = isFuture
            ? `${month}월 ${day}일, 미래`
            : `${month}월 ${day}일, 일기 ${entries.length}개`;
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-label={aria}
              aria-disabled={isFuture}
              onClick={() => onDayTap(day)}
              style={{
                height: 56,
                border: "none",
                borderRadius: "var(--radius-md)",
                background: entries.length
                  ? "color-mix(in srgb, var(--accent-rose) 5%, transparent)"
                  : isToday
                    ? "var(--accent-rose-soft)"
                    : "transparent",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                cursor: isFuture ? "default" : "pointer",
                opacity: loading ? 0.5 : 1,
                transition: "opacity var(--duration-base, 200ms) var(--ease-out, ease)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  fontWeight: isToday ? 600 : 400,
                  color: isFuture
                    ? "var(--border-strong)"
                    : isToday
                      ? "var(--accent-rose-deep)"
                      : "var(--fg)",
                }}
              >
                {day}
              </span>
              <span style={{ display: "flex", gap: 3, height: 5 }}>
                {entries.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: dotColor(e) }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          style={{
            marginTop: "var(--space-4)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
            backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {error}
        </p>
      )}

      {/* 빈 달 안내 */}
      {Object.keys(days).length === 0 && !loading && !error && (
        <p
          style={{
            marginTop: "var(--space-6)",
            textAlign: "center",
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-subtle)",
            lineHeight: "var(--leading-relaxed)",
          }}
        >
          이 달엔 아직 기록이 없어요.
          <br />
          비어있는 날을 눌러 첫 페이지를 열어볼까요?
        </p>
      )}

      {/* 범례 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2) var(--space-4)",
          marginTop: "var(--space-5)",
          paddingTop: "var(--space-4)",
          borderTop: "1px solid var(--border)",
        }}
      >
        {MOODS.map((m) => (
          <LegendItem key={m.key} color={m.color} label={m.label} />
        ))}
        <LegendItem color={NEUTRAL_DOT} label="미설정" hollow />
      </div>

      {/* 그날 목록 시트 (1편+) */}
      <BottomSheet isOpen={openDate !== null} onClose={() => setOpenDate(null)}>
        {openDate && (
          <div style={{ padding: "0 var(--space-5) var(--space-2)" }}>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-lg)",
                fontWeight: 600,
                color: "var(--fg)",
                margin: "0 0 var(--space-3)",
              }}
            >
              {sheetDateLabel(openDate)} · {openEntries.length}편
            </h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {openEntries.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => router.push(`/diary/${e.id}`)}
                  style={{
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    borderTop: "1px solid var(--border)",
                    padding: "var(--space-3) 0",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
                    {e.mood && KNOWN_MOOD_KEYS.has(e.mood) ? (
                      <MoodBadge mood={e.mood} size="sm" />
                    ) : (
                      <span aria-hidden style={{ fontSize: 14 }}>
                        {e.source === "ai" ? "📷" : "📝"}
                      </span>
                    )}
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--fg-subtle)" }}>
                      {timeLabel(e.createdAt)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-serif)",
                      fontSize: "var(--text-sm)",
                      color: "var(--fg)",
                      lineHeight: "var(--leading-relaxed)",
                    }}
                  >
                    {e.title?.trim() || snippet(e.content)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function LegendItem({ color, label, hollow }: { color: string; label: string; hollow?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        color: "var(--fg-subtle)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: hollow ? "transparent" : color,
          border: hollow ? `1.5px solid ${color}` : "none",
        }}
      />
      {label}
    </span>
  );
}

const navBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "none",
  background: "none",
  fontSize: 22,
  lineHeight: 1,
  color: "var(--fg-muted)",
  cursor: "pointer",
  borderRadius: "var(--radius-md)",
};
const todayBtn: React.CSSProperties = {
  border: "none",
  background: "none",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  cursor: "pointer",
  padding: "4px 8px",
};
