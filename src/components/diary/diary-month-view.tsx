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
function snippet(content: string, n = 50): string {
  const t = content.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}
function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 ${wd}요일`;
}

type DaysMap = Record<string, CalendarEntry[]>;
function ymStr(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}
// delta 개월 이동 (음수=이전). Date 정규화로 연도 경계 자동 처리.
function addMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const d = new Date(y, m - 1 + delta, 1);
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}
function weeksOf(y: number, m: number): number {
  return buildCells(y, m).length / 7;
}

/**
 * 한 달치 날짜 그리드(주 7열). 카루셀 패널 단위로 쓰인다.
 * interactive=true인 가운데(현재) 패널만 탭 가능하고, 양옆 미리보기 패널은
 * aria-hidden 비대화형(드래그 중 비치는 용도)이다.
 */
function MonthGrid({
  year,
  month,
  days,
  todayKey,
  selectedKey,
  interactive,
  onDayTap,
}: {
  year: number;
  month: number;
  days: DaysMap;
  todayKey: string;
  selectedKey: string;
  interactive: boolean;
  onDayTap?: (day: number) => void;
}) {
  const cells = buildCells(year, month);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div
      role={interactive ? "grid" : undefined}
      aria-hidden={interactive ? undefined : true}
      style={{
        flex: "0 0 100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: GAP,
        alignContent: "flex-start",
      }}
    >
      {weeks.map((week, wi) => (
        <div
          role={interactive ? "row" : undefined}
          key={`w${wi}`}
          style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: GAP }}
        >
          {week.map((day, di) => {
            if (day == null)
              return <div key={`b${wi}-${di}`} style={{ height: ROW }} />;
            const key = cellKey(year, month, day);
            const entries = days[key] ?? [];
            const isToday = key === todayKey;
            const isSelected = interactive && key === selectedKey;
            const isFuture = key > todayKey;

            // 오늘: tint 원형 배경 + 흰 숫자 / 선택(비오늘): tint 하이라이트 / 일기 있는 날: fill-2
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

            const cellStyle: React.CSSProperties = {
              height: ROW,
              border:
                isSelected && !isToday
                  ? "1.5px solid var(--tint)"
                  : "1.5px solid transparent",
              borderRadius: "var(--radius-md)",
              background: bgColor,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              cursor: interactive && !isFuture ? "pointer" : "default",
            };
            const inner = (
              <>
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
              </>
            );

            if (!interactive) {
              return (
                <div key={key} style={cellStyle}>
                  {inner}
                </div>
              );
            }
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
                onClick={() => onDayTap?.(day)}
                style={cellStyle}
              >
                {inner}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
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
  // 월별 데이터 캐시 — 인접 달을 미리 받아 카루셀 드래그 중 dot까지 비친다.
  const [monthCache, setMonthCache] = useState<Record<string, DaysMap>>(() => ({
    [ymStr(initialYear, initialMonth)]: initialDays,
  }));
  const [error, setError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>(() =>
    initialYear === ty && initialMonth === tm
      ? todayKey
      : cellKey(initialYear, initialMonth, 1),
  );

  // 카루셀 드래그/전환 상태
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ sx: 0, sy: 0, st: 0, dragging: false, armed: false });
  const dxRef = useRef(0);
  const [dx, setDx] = useState(0); // 드래그 오프셋 px (트랙 translateX 계산용)
  const [committing, setCommitting] = useState<null | "prev" | "next" | "snap">(
    null,
  );

  const canGoNext = ym(year, month) < todayYm;

  // 현재/이전/다음 달 + 각 데이터 (캐시에서, 없으면 빈 맵)
  const prev = addMonth(year, month, -1);
  const next = addMonth(year, month, 1);
  const days = monthCache[ymStr(year, month)] ?? {};
  const prevDays = monthCache[ymStr(prev.y, prev.m)] ?? {};
  const nextDays = monthCache[ymStr(next.y, next.m)] ?? {};

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

  // 현재·이전·다음 달 데이터 프리페치 (캐시에 없을 때만). 인접 달을 미리 받아둬야
  // 드래그 중 비치는 패널에 dot이 보인다.
  useEffect(() => {
    const wants: Array<[number, number]> = [
      [year, month],
      [prev.y, prev.m],
      [next.y, next.m],
    ];
    for (const [y, m] of wants) {
      const k = ymStr(y, m);
      if (monthCache[k]) continue;
      fetch(`/api/diaries/calendar?month=${k}`)
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) {
            if (y === year && m === month)
              setError(data?.error ?? "불러오지 못했어요");
            return;
          }
          setMonthCache((c) => (c[k] ? c : { ...c, [k]: data.days }));
        })
        .catch(() => {
          if (y === year && m === month) setError("불러오지 못했어요");
        });
    }
    // monthCache는 의도적으로 의존성에서 제외(월 변경 시에만 프리페치, 캐시 갱신 루프 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // 커밋 후 트랙을 -100%로 즉시 리베이스 — 같은 내용이 같은 자리에 오므로 점프 없음.
  function rebaseTo(y: number, m: number) {
    setCommitting(null);
    setDx(0);
    dxRef.current = 0;
    setYear(y);
    setMonth(m);
    setSelectedKey(y === ty && m === tm ? todayKey : cellKey(y, m, 1));
    setError(null);
    window.scrollTo({ top: 0 });
    setScrolled(false);
  }

  function onTrackTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== "transform" || !committing) return;
    if (committing === "snap") {
      setCommitting(null);
      setDx(0);
      dxRef.current = 0;
      return;
    }
    const t = committing === "prev" ? prev : next;
    rebaseTo(t.y, t.m);
  }

  function goPrev() {
    if (committing) return;
    setCommitting("prev");
  }
  function goNext() {
    if (committing || !canGoNext) return;
    setCommitting("next");
  }
  function goToday() {
    if (committing || (ty === year && tm === month)) return;
    rebaseTo(ty, tm); // 멀리 점프 — 애니메이션 없이 즉시
  }

  function onTouchStart(e: React.TouchEvent) {
    if (committing) return;
    const t = e.touches[0];
    dragRef.current = {
      sx: t.clientX,
      sy: t.clientY,
      st: e.timeStamp,
      dragging: false,
      armed: true,
    };
  }
  function onTouchMove(e: React.TouchEvent) {
    const d = dragRef.current;
    if (!d.armed) return;
    const t = e.touches[0];
    const ddx = t.clientX - d.sx;
    const ddy = t.clientY - d.sy;
    if (!d.dragging) {
      // 세로 우세 → 스크롤 의도, 취소 (touch-action: pan-y로 세로는 브라우저가 처리)
      if (Math.abs(ddy) > Math.abs(ddx)) {
        d.armed = false;
        return;
      }
      if (Math.abs(ddx) > 8) d.dragging = true;
      else return;
    }
    // 다음 달(미래) 불가 시 왼쪽 드래그에 저항
    const v = !canGoNext && ddx < 0 ? ddx * 0.3 : ddx;
    dxRef.current = v;
    setDx(v);
  }
  function onTouchEnd(e: React.TouchEvent) {
    const d = dragRef.current;
    if (!d.dragging) {
      d.armed = false;
      return;
    }
    d.armed = false;
    d.dragging = false;
    const w = viewportRef.current?.clientWidth ?? 350;
    const v = dxRef.current;
    const elapsed = e.timeStamp - d.st;
    const far = Math.abs(v) > w * 0.3;
    const flick = Math.abs(v) > 60 && elapsed < 300;
    if (v > 0 && (far || flick)) setCommitting("prev");
    else if (v < 0 && (far || flick) && canGoNext) setCommitting("next");
    else setCommitting("snap");
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

  const dayKeys = Object.keys(days).sort().reverse();

  // 뷰포트 높이: 세 패널 중 최대 주 수에 맞춰 고정 → 다른 주 수의 인접 달이 잘리지 않음
  const maxWeeks = Math.max(
    weeksOf(prev.y, prev.m),
    weeksOf(year, month),
    weeksOf(next.y, next.m),
  );
  const viewportHeight = maxWeeks * ROW + (maxWeeks - 1) * GAP;
  const trackTransform =
    committing === "prev"
      ? "translateX(0%)"
      : committing === "next"
        ? "translateX(-200%)"
        : committing === "snap"
          ? "translateX(-100%)"
          : dx !== 0
            ? `translateX(calc(-100% + ${dx}px))`
            : "translateX(-100%)";

  return (
    <div style={{ userSelect: "none" }}>
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

        {/* 그리드 — 3패널 카루셀(이전·현재·다음): 손가락 따라 인접 달이 비친다.
            touchAction: pan-y로 세로 스크롤은 브라우저, 가로는 카루셀이 가져간다. */}
        <div
          ref={viewportRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ overflow: "hidden", height: viewportHeight, touchAction: "pan-y" }}
        >
          <div
            onTransitionEnd={onTrackTransitionEnd}
            style={{
              display: "flex",
              transform: trackTransform,
              transition: committing ? "transform 320ms var(--ease-soft)" : "none",
            }}
          >
            <MonthGrid
              year={prev.y}
              month={prev.m}
              days={prevDays}
              todayKey={todayKey}
              selectedKey={selectedKey}
              interactive={false}
            />
            <MonthGrid
              year={year}
              month={month}
              days={days}
              todayKey={todayKey}
              selectedKey={selectedKey}
              interactive
              onDayTap={onDayTap}
            />
            <MonthGrid
              year={next.y}
              month={next.m}
              days={nextDays}
              todayKey={todayKey}
              selectedKey={selectedKey}
              interactive={false}
            />
          </div>
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
