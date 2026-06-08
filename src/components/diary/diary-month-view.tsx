"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DiarySearchView } from "./diary-search-view";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
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

// 그리드 셀 행 높이/간격.
const ROW = 56;
const GAP = 4;

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
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function snippet(content: string, n = 50): string {
  const t = content.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}
function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 ${wd}요일`;
}

/**
 * 일기 통합 뷰 — 검색창 + (검색 비활성 시) 접히는 월 달력 + 그 달 목록.
 * 검색이 활성화되면 DiarySearchView가 결과를 그리고 달력/목록은 숨긴다.
 */
export function DiaryMonthView(props: Props) {
  const [searchActive, setSearchActive] = useState(false);
  const onActiveChange = useCallback((active: boolean) => {
    setSearchActive(active);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <DiarySearchView onActiveChange={onActiveChange} />
      <div style={{ display: searchActive ? "none" : "block" }}>
        <MonthCalendarList {...props} />
      </div>
    </div>
  );
}

function MonthCalendarList({ initialYear, initialMonth, initialDays }: Props) {
  const router = useRouter();
  const todayKey = kstTodayKey();
  const [ty, tm] = todayKey.split("-").map(Number);
  const todayYm = ym(ty, tm);

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState(initialDays);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(() =>
    initialYear === ty && initialMonth === tm
      ? todayKey
      : cellKey(initialYear, initialMonth, 1),
  );
  const reqRef = useRef(0);
  const touchX = useRef<number | null>(null);

  const canGoNext = ym(year, month) < todayYm;

  // 스크롤 플래그: 그리드가 위로 스크롤돼 사라지면 월 바에 '일기' 라벨을 띄운다.
  // (그리드는 높이 애니메이션 없이 자연 스크롤 — 레이아웃 변화가 없어 overshoot 없음.)
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // 히스테리시스: 80 넘으면 스크롤됨 / 40 미만이면 해제 (경계 떨림 방지).
        setScrolled((prev) => {
          const y = window.scrollY;
          if (!prev && y > 80) return true;
          if (prev && y < 40) return false;
          return prev;
        });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // 날짜 탭으로 스크롤한 그날 섹션 하이라이트는 잠깐 보였다 사라진다.
  useEffect(() => {
    if (!highlightKey) return;
    const t = setTimeout(() => setHighlightKey(null), 2400);
    return () => clearTimeout(t);
  }, [highlightKey]);

  async function loadMonth(y: number, m: number) {
    setYear(y);
    setMonth(m);
    setSelectedKey(y === ty && m === tm ? todayKey : cellKey(y, m, 1));
    setError(null);
    setLoading(true);
    // 월 이동 시 맨 위로 → 달력 그리드 다시 보이게.
    window.scrollTo({ top: 0 });
    setScrolled(false);
    const reqId = ++reqRef.current;
    try {
      const res = await fetch(
        `/api/diaries/calendar?month=${y}-${String(m).padStart(2, "0")}`,
      );
      const data = await res.json();
      if (reqId !== reqRef.current) return; // 연타 stale 무시
      if (!res.ok) {
        setError(data?.error ?? "불러오지 못했어요");
        return;
      }
      setDays(data.days);
    } catch {
      if (reqId === reqRef.current) setError("불러오지 못했어요");
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
    setSelectedKey(key);
    const entries = days[key];
    if (!entries || entries.length === 0) {
      // 오늘 빈 날은 바로 작성, 과거 빈 날은 실수 진입 방지로 확인 후 이동.
      if (key === todayKey) router.push(`/diary/new?date=${key}`);
      else setPendingDate(key);
      return;
    }
    // 그날 섹션을 sticky 월 바 바로 아래로 스크롤 + 잠깐 하이라이트(도착 명확화).
    setHighlightKey(key);
    requestAnimationFrame(() => {
      document
        .getElementById(`day-${key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const cells = buildCells(year, month);
  // 주 단위로 끊어 role="row"로 감싼다 (ARIA grid > row > gridcell 구조).
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // 그 달 목록 — 날짜 내림차순.
  const dayKeys = Object.keys(days).sort().reverse();

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ userSelect: "none" }}>
      {/* 접히는 달력 (sticky) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          backgroundColor: "var(--bg)",
          paddingBottom: "var(--space-2)",
        }}
      >
        {/* 월 네비 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "var(--space-3)",
          }}
        >
          <button type="button" onClick={goPrev} aria-label="이전 달" style={navBtn}>‹</button>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              lineHeight: 1.1,
            }}
          >
            {/* 스크롤돼 페이지 헤더('일기')가 사라진 뒤에도 화면 정체성 유지 */}
            {scrolled && (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "var(--tracking-wider)",
                  color: "var(--fg-subtle)",
                }}
              >
                일기
              </span>
            )}
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
          </div>
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
      </div>

      {/* 요일 헤더 + 그리드 — 일반 흐름이라 스크롤하면 월 바 뒤로 자연스럽게 사라진다. */}
      <div style={{ paddingBottom: "var(--space-1)" }}>
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
                  color: i === 0 ? "var(--danger)" : i === 6 ? "var(--info)" : "var(--fg-subtle)",
                }}
              >
                {w}
              </span>
            ))}
          </div>

          {/* 그리드 */}
          <div
            role="grid"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: GAP,
            }}
          >
            {weeks.map((week, wi) => (
              <div
                role="row"
                key={`w${wi}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: GAP,
                }}
              >
                {week.map((day, di) => {
                  if (day == null)
                    return <div role="gridcell" key={`b${wi}-${di}`} style={{ height: ROW }} />;
                  const key = cellKey(year, month, day);
                  const entries = days[key] ?? [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedKey;
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
                        height: ROW,
                        border: isSelected ? "1px solid var(--accent-rose)" : "1px solid transparent",
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
            ))}
          </div>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            marginTop: "var(--space-3)",
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

      {/* 범례 — 그리드와 함께 자연 스크롤 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2) var(--space-4)",
          margin: "var(--space-2) 0 var(--space-4)",
          paddingTop: "var(--space-3)",
          borderTop: "1px solid var(--border)",
        }}
      >
        {MOODS.map((m) => (
          <LegendItem key={m.key} color={m.color} label={m.label} />
        ))}
        <LegendItem color={NEUTRAL_DOT} label="미설정" hollow />
      </div>

      {/* 그 달 목록 */}
      {dayKeys.length === 0 ? (
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
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
            paddingBottom: "calc(56px + env(safe-area-inset-bottom) + var(--space-6))",
          }}
        >
          {dayKeys.map((key) => (
            <section
              key={key}
              id={`day-${key}`}
              style={{
                scrollMarginTop: 64,
                // 상시 패딩 + 동일 음수 마진 → 콘텐츠 위치·섹션 간격 불변, 하이라이트 박스만 바깥으로 확장.
                // 가로는 space-2(8px): 카드보다 넓히되 페이지 셸(가로 space-4)을 넘지 않아 overflow 없음.
                padding: "var(--space-3) var(--space-2)",
                margin: "calc(-1 * var(--space-3)) calc(-1 * var(--space-2))",
                borderRadius: "var(--radius-lg)",
                backgroundColor:
                  highlightKey === key
                    ? "color-mix(in srgb, var(--accent-rose) 16%, transparent)"
                    : "transparent",
                boxShadow:
                  highlightKey === key
                    ? "0 0 0 1.5px color-mix(in srgb, var(--accent-rose) 55%, transparent), var(--shadow-sm)"
                    : "none",
                transition:
                  "background-color 0.45s var(--ease-out, ease), box-shadow 0.45s var(--ease-out, ease)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 var(--space-2) 0",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--fg-subtle)",
                  fontWeight: 700,
                  letterSpacing: "var(--tracking-wider)",
                }}
              >
                {dayLabel(key)}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {days[key].map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => router.push(`/diary/${e.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      textAlign: "left",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-3) var(--space-4)",
                      cursor: "pointer",
                      boxShadow: "var(--shadow-xs)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
                        {e.mood && KNOWN_MOOD_KEYS.has(e.mood) ? (
                          <MoodBadge mood={e.mood} size="sm" />
                        ) : (
                          <span aria-hidden style={{ fontSize: 14 }}>
                            {e.source.startsWith("auto_") ? "📷" : "📝"}
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
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {e.title?.trim() || snippet(e.content)}
                      </p>
                    </div>
                    {e.thumbnailUrl && (
                      <Image
                        src={e.thumbnailUrl}
                        alt=""
                        width={64}
                        height={64}
                        sizes="64px"
                        style={{
                          flexShrink: 0,
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmSheet
        isOpen={pendingDate != null}
        onClose={() => setPendingDate(null)}
        onConfirm={() => {
          if (pendingDate) router.push(`/diary/new?date=${pendingDate}`);
        }}
        title={pendingDate ? dayLabel(pendingDate) : ""}
        description="이 날짜로 새 일기를 쓸까요?"
        confirmLabel="쓰기"
      />
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
