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
const MOOD_DOT_COLOR: Record<string, string> = Object.fromEntries(
  MOODS.map((m) => [m.key, m.color]),
);

// 그리드 셀 행 높이/간격.
const ROW = 52;
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
    : "var(--fg-placeholder)";
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
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
  const touchY = useRef<number | null>(null);
  // 월 전환 방향 — 그리드 슬라이드 애니메이션용 (오늘 점프는 애니메이션 없음)
  const [slideDir, setSlideDir] = useState<"prev" | "next" | null>(null);

  const canGoNext = ym(year, month) < todayYm;

  // 스크롤 플래그: 그리드가 위로 스크롤돼 사라지면 월 바에 '일기' 라벨을 띄운다.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
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
    window.scrollTo({ top: 0 });
    setScrolled(false);
    const reqId = ++reqRef.current;
    try {
      const res = await fetch(
        `/api/diaries/calendar?month=${y}-${String(m).padStart(2, "0")}`,
      );
      const data = await res.json();
      if (reqId !== reqRef.current) return;
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
    setSlideDir("prev");
    void loadMonth(d.getFullYear(), d.getMonth() + 1);
  }
  function goNext() {
    if (!canGoNext) return;
    const d = new Date(year, month, 1);
    setSlideDir("next");
    void loadMonth(d.getFullYear(), d.getMonth() + 1);
  }
  function goToday() {
    if (ty === year && tm === month) return;
    setSlideDir(null);
    void loadMonth(ty, tm);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null || touchY.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;
    touchX.current = null;
    touchY.current = null;
    // 의도치 않은 월 전환 방지: 충분히 길고(60px+) 수평이 지배적인 스와이프만.
    if (Math.abs(dx) < 60) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  function onDayTap(day: number) {
    const key = cellKey(year, month, day);
    if (key > todayKey) return; // 미래
    setSelectedKey(key);
    const entries = days[key];
    if (!entries || entries.length === 0) {
      if (key === todayKey) router.push(`/diary/new?date=${key}`);
      else setPendingDate(key);
      return;
    }
    setHighlightKey(key);
    requestAnimationFrame(() => {
      document
        .getElementById(`day-${key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const cells = buildCells(year, month);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const dayKeys = Object.keys(days).sort().reverse();

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ userSelect: "none" }}>
      {/* sticky 월 바 — .glass 블러 재질, 스크롤 시 더 불투명 */}
      <div
        className={scrolled ? "glass is-scrolled" : "glass"}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          paddingTop: "var(--space-2)",
          paddingBottom: "var(--space-2)",
          marginLeft: "calc(var(--space-4) * -1)",
          marginRight: "calc(var(--space-4) * -1)",
          paddingLeft: "var(--space-4)",
          paddingRight: "var(--space-4)",
          borderBottom: "1px solid var(--separator)",
        }}
      >
        {/* 월 네비 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button type="button" onClick={goPrev} aria-label="이전 달" style={navBtn}>‹</button>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              lineHeight: 1.1,
            }}
          >
            {scrolled && (
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--fg-placeholder)",
                  letterSpacing: 0,
                }}
              >
                일기
              </span>
            )}
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-lg)",
                fontWeight: 600,
                color: "var(--fg)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {year}년 {month}월
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            <button
              type="button"
              onClick={goToday}
              style={{
                ...todayBtn,
                color: ym(year, month) === todayYm ? "var(--fg-placeholder)" : "var(--tint)",
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

      {/* 요일 헤더 + 그리드 */}
      <div style={{ paddingTop: "var(--space-3)", paddingBottom: "var(--space-1)" }}>
        {/* 요일 헤더 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "var(--space-2)" }}>
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              style={{
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                color: i === 0 ? "var(--danger)" : i === 6 ? "var(--info)" : "var(--fg-placeholder)",
              }}
            >
              {w}
            </span>
          ))}
        </div>

        {/* 그리드 — 월이 바뀌면 방향에 맞춰 슬라이드 인 */}
        <style>{`
          @keyframes month-slide-next {
            from { opacity: 0; transform: translateX(28px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes month-slide-prev {
            from { opacity: 0; transform: translateX(-28px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
        <div
          role="grid"
          key={`${year}-${month}`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: GAP,
            animation: slideDir
              ? `month-slide-${slideDir} 240ms var(--ease-out)`
              : undefined,
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

                // 오늘: tint 원형 배경 + 흰 숫자
                // 선택(비오늘): tint 하이라이트 (명확한 대비)
                // 일기 있는 날(비선택): fill-2 배경
                const bgColor = isToday
                  ? "var(--tint)"
                  : isSelected
                    ? "var(--tint-soft)"
                    : entries.length
                      ? "var(--fill-2)"
                      : "transparent";

                const numColor = isToday
                  ? "var(--on-tint)"
                  : isSelected
                    ? "var(--tint)"
                    : isFuture
                      ? "var(--fg-quaternary)"
                      : "var(--fg)";

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
                      border: isSelected && !isToday ? "1.5px solid var(--tint)" : "1.5px solid transparent",
                      borderRadius: "var(--radius-md)",
                      background: bgColor,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      cursor: isFuture ? "default" : "pointer",
                      opacity: loading ? 0.5 : 1,
                      transition: "opacity var(--duration-base, 200ms) var(--ease-out, ease)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 15,
                        fontWeight: isToday || isSelected ? 600 : 400,
                        color: numColor,
                        lineHeight: 1,
                      }}
                    >
                      {day}
                    </span>
                    {/* mood dot — 일기 있는 날만 표시 */}
                    <span style={{ display: "flex", gap: 3, height: 9, alignItems: "center" }}>
                      {entries.slice(0, 2).map((e) => (
                        <span
                          key={e.id}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: dotColor(e),
                            flexShrink: 0,
                          }}
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

      {/* 범례 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2) var(--space-4)",
          margin: "var(--space-2) 0 var(--space-5)",
          paddingTop: "var(--space-3)",
          borderTop: "1px solid var(--separator)",
        }}
      >
        {MOODS.map((m) => (
          <LegendItem key={m.key} color={m.color} label={m.label} />
        ))}
        <LegendItem color="var(--fg-placeholder)" label="미설정" />
      </div>

      {/* 그 달 목록 */}
      {dayKeys.length === 0 ? (
        <div
          style={{
            marginTop: "var(--space-8)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span style={{ fontSize: 32, color: "var(--fg-placeholder)" }}>📓</span>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-md)",
              fontWeight: 600,
              color: "var(--fg)",
              margin: 0,
            }}
          >
            이 달엔 아직 기록이 없어요
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              color: "var(--fg-muted)",
              margin: 0,
            }}
          >
            비어있는 날을 눌러 첫 페이지를 열어볼까요?
          </p>
        </div>
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
                scrollMarginTop: 72,
                padding: "var(--space-3) var(--space-2)",
                margin: "calc(-1 * var(--space-3)) calc(-1 * var(--space-2))",
                borderRadius: "var(--radius-lg)",
                backgroundColor:
                  highlightKey === key
                    ? "color-mix(in srgb, var(--tint) 8%, transparent)"
                    : "transparent",
                transition:
                  "background-color 0.45s var(--ease-out, ease)",
              }}
            >
              {/* 날짜 섹션 헤더 */}
              <h3
                style={{
                  margin: "0 0 var(--space-2) var(--space-1)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--fg-muted)",
                  fontWeight: 500,
                  letterSpacing: 0,
                }}
              >
                {dayLabel(key)}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {days[key].map((e) => (
                  <DiaryListCard key={e.id} entry={e} onClick={() => router.push(`/diary/${e.id}`)} />
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

/** DiaryCard — 흰 카드 radius 16, MoodBadge, 화살표 없음 */
function DiaryListCard({
  entry: e,
  onClick,
}: {
  entry: CalendarEntry;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        textAlign: "left",
        background: "var(--surface)",
        border: "none",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-3) var(--space-4)",
        cursor: "pointer",
        width: "100%",
        minHeight: 44,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 메타 줄: mood badge + 시간 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-1)",
          }}
        >
          {e.mood && KNOWN_MOOD_KEYS.has(e.mood) ? (
            <MoodBadge mood={e.mood} size="sm" />
          ) : (
            // 감정 미설정도 자리를 비우지 않는다 — 회색 dot으로 "감정의 자리" 유지
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "var(--fg-quaternary)",
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-placeholder)",
            }}
          >
            {timeLabel(e.createdAt)}
          </span>
        </div>
        {/* 제목 / 미리보기 */}
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--fg)",
            letterSpacing: "var(--tracking-tight)",
            lineHeight: "var(--leading-snug)",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {e.title?.trim() || snippet(e.content)}
        </p>
        {/* 본문 미리보기 (제목 있을 때만) */}
        {e.title?.trim() && (
          <p
            style={{
              margin: "var(--space-1) 0 0",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              color: "var(--fg-muted)",
              lineHeight: "var(--leading-normal)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {snippet(e.content, 80)}
          </p>
        )}
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
          }}
        />
      )}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        color: "var(--fg-placeholder)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

const navBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  border: "none",
  background: "none",
  fontSize: 22,
  lineHeight: 1,
  color: "var(--tint)",
  cursor: "pointer",
  borderRadius: "var(--radius-md)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const todayBtn: React.CSSProperties = {
  border: "none",
  background: "none",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-base)",
  fontWeight: 600,
  cursor: "pointer",
  padding: "var(--space-2) var(--space-2)",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
};
