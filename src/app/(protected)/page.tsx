import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  getDiaryCounts,
  getRecentDiaries,
  getTodayDiary,
} from "@/lib/diary/queries";
import {
  KNOWN_MOOD_KEYS,
  MOOD_COLOR,
  type MoodKey,
} from "@/components/diary/mood-data";

// MIG-12 홈 재배치. 적은 일기 수에도 비어 보이지 않게:
//   - 상단 헤더 (메모이즘 + 오늘 날짜)
//   - "오늘의 일기" 위젯 (있으면 카드, 없으면 "오늘 첫 줄 시작해볼까?" CTA)
//   - "이번 달" 요약 strip (이번 달 / 전체 기록 수) — 적어도 모은 기록을 안심시키는 단서
//   - 최근 일기 6개 (날짜·요일·2줄 발췌·썸네일 — /diary 카드와 동일 어휘)

const todayLabelFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "short",
});
const dayFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
});
const weekdayFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  weekday: "short",
});

function snippet(content: string, n = 90): string {
  const plain = content
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > n ? `${plain.slice(0, n)}…` : plain;
}

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [todayDiary, recentDiaries, counts] = await Promise.all([
    getTodayDiary(session.userId),
    getRecentDiaries(session.userId, 7),
    getDiaryCounts(session.userId),
  ]);

  // 최근 일기에서 오늘 일기는 중복 제거 후 6개까지
  const otherRecent = (
    todayDiary
      ? recentDiaries.filter((d) => d.id !== todayDiary.id)
      : recentDiaries
  ).slice(0, 6);

  const hasAny = counts.total > 0;

  // 22시 리마인드 이후 밤 방문이 주 사용 맥락 — 시간대에 맞는 인사 (KST)
  const kstHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  const isNight = kstHour >= 21 || kstHour < 4;
  const emptyTitle = isNight
    ? "오늘도 수고했어요"
    : "오늘 첫 줄, 시작해볼까?";
  const emptySubtitle = isNight
    ? "잠들기 전 잠깐, 오늘을 남겨볼까요? 사진만 있어도 AI가 정리해줘요."
    : "사진만 있어도, 텍스트만 있어도 AI가 정리해줘요.";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100svh - 56px)",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* 헤더 — iOS Large Title 위계 */}
      <header
        style={{
          padding: "var(--space-5) var(--space-5) var(--space-3)",
          paddingTop: "calc(var(--space-5) + env(safe-area-inset-top))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-3xl)",
              fontWeight: 700,
              color: "var(--fg)",
              margin: 0,
              letterSpacing: "var(--tracking-tight)",
              lineHeight: 1.18,
            }}
          >
            메모이즘
          </h1>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fg-muted)",
              fontWeight: 400,
            }}
          >
            {todayLabelFmt.format(new Date())}
          </span>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
          padding: "var(--space-3) var(--space-5) var(--space-8)",
        }}
      >
        {/* 오늘의 일기 위젯 */}
        {todayDiary ? (
          <Link
            href={`/diary/${todayDiary.id}`}
            className="pressable"
            style={{
              display: "flex",
              gap: "var(--space-4)",
              alignItems: "stretch",
              padding: "var(--space-4) var(--space-5)",
              backgroundColor: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xs)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--tint)",
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 4,
                  letterSpacing: 0,
                }}
              >
                오늘의 일기
              </p>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-md)",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--fg)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "var(--tracking-tight)",
                }}
              >
                {todayDiary.title || "(제목 없음)"}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                  color: "var(--fg-muted)",
                  margin: "var(--space-2) 0 0 0",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: 1.45,
                }}
              >
                {snippet(todayDiary.content)}
              </p>
            </div>
            {todayDiary.thumbnailUrl && (
              <div
                aria-hidden
                style={{
                  position: "relative",
                  width: 64,
                  height: 64,
                  flexShrink: 0,
                  overflow: "hidden",
                  borderRadius: "var(--radius-md)",
                  alignSelf: "center",
                  backgroundColor: "var(--fill-2)",
                }}
              >
                <Image
                  src={todayDiary.thumbnailUrl}
                  alt=""
                  fill
                  sizes="64px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            )}
          </Link>
        ) : (
          /* 빈 상태 — Empty State 패턴. dashed border 없음 */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-8) var(--space-5)",
              /* 옅은 코랄 워시 — "오늘을 위한 자리"라는 온기 (4%) */
              backgroundColor:
                "color-mix(in srgb, var(--tint) 4%, var(--surface))",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-xs)",
              textAlign: "center",
            }}
          >
            <span aria-hidden style={{ color: "var(--fg-placeholder)", lineHeight: 0 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
              </svg>
            </span>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-md)",
                fontWeight: 600,
                color: "var(--fg)",
                margin: 0,
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {emptyTitle}
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                color: "var(--fg-muted)",
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              {emptySubtitle}
            </p>
            <Link
              href="/diary/new"
              className="pressable"
              style={{
                display: "inline-block",
                marginTop: "var(--space-2)",
                padding: "10px 20px",
                backgroundColor: "var(--tint-soft)",
                color: "var(--tint)",
                borderRadius: "var(--radius-md)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                textDecoration: "none",
                minHeight: 44,
                lineHeight: "24px",
              }}
            >
              일기 쓰기
            </Link>
          </div>
        )}

        {/* 이번 달 요약 strip */}
        {hasAny && (
          <section aria-label="기록 요약">
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                backgroundColor: "var(--surface)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
              }}
            >
              <SummaryStat label="이번 달" value={counts.thisMonth} />
              <div
                aria-hidden
                style={{ width: 1, backgroundColor: "var(--separator)" }}
              />
              <SummaryStat label="모은 기록" value={counts.total} />
            </div>
          </section>
        )}

        {/* 최근 일기 */}
        {otherRecent.length > 0 ? (
          <section>
            {/* 섹션 제목: 카드 밖 좌측, 13px secondary */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-2)",
                paddingLeft: 2,
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  color: "var(--fg-muted)",
                  fontWeight: 500,
                  letterSpacing: 0,
                  margin: 0,
                }}
              >
                최근 일기
              </h2>
              <Link
                href="/diary"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  color: "var(--tint)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                전체 보기
              </Link>
            </div>
            {/* iOS list group — 흰 카드 하나에 행들 + inset divider */}
            <div
              style={{
                backgroundColor: "var(--surface)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
              }}
            >
              {otherRecent.map((diary, idx) => {
                const date = new Date(diary.createdAt);
                const previewTitle =
                  diary.title?.trim() ||
                  diary.content.split("\n")[0].slice(0, 40) ||
                  "(제목 없음)";
                return (
                  <div key={diary.id}>
                    <Link
                      href={`/diary/${diary.id}`}
                      className="pressable"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-3) var(--space-4)",
                        textDecoration: "none",
                        color: "inherit",
                        minHeight: 52,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "var(--font-sans)",
                            fontSize: "var(--text-sm)",
                            color: "var(--fg-muted)",
                            fontWeight: 400,
                            marginBottom: 2,
                          }}
                        >
                          {/* mood dot — 감정의 자리 (미설정은 회색) */}
                          <span
                            aria-hidden
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor:
                                diary.mood && KNOWN_MOOD_KEYS.has(diary.mood)
                                  ? MOOD_COLOR[diary.mood as MoodKey]
                                  : "var(--fg-quaternary)",
                              flexShrink: 0,
                            }}
                          />
                          <time dateTime={date.toISOString()}>
                            {dayFmt.format(date)}
                          </time>
                          <span style={{ color: "var(--fg-placeholder)" }}>
                            ·
                          </span>
                          <span>{weekdayFmt.format(date)}요일</span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: "var(--font-sans)",
                            fontSize: "var(--text-base)",
                            fontWeight: 600,
                            lineHeight: 1.45,
                            color: "var(--fg)",
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {diary.title?.trim() || snippet(diary.content) || previewTitle}
                        </p>
                      </div>
                      <span
                        aria-hidden
                        style={{
                          fontSize: 13,
                          color: "var(--fg-placeholder)",
                          flexShrink: 0,
                        }}
                      >
                        ›
                      </span>
                    </Link>
                    {/* inset divider — 마지막 행 제외 */}
                    {idx < otherRecent.length - 1 && (
                      <div
                        aria-hidden
                        style={{
                          height: 1,
                          backgroundColor: "var(--separator)",
                          marginLeft: "var(--space-4)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          hasAny && (
            // 오늘 일기는 있지만 그 외 기록이 없는 경우 — 잔잔한 격려
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                color: "var(--fg-muted)",
                textAlign: "center",
                margin: "var(--space-4) 0",
                lineHeight: 1.7,
              }}
            >
              오늘의 한 줄이 첫 페이지예요.
              <br />
              내일도 한 장씩, 천천히 쌓아가요.
            </p>
          )
        )}
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "var(--space-4) var(--space-3)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-2xl)",
          fontWeight: 700,
          color: "var(--fg)",
          lineHeight: 1.1,
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        {value}
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            fontWeight: 400,
            marginLeft: 2,
          }}
        >
          편
        </span>
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-muted)",
          fontWeight: 500,
          letterSpacing: 0,
        }}
      >
        {label}
      </span>
    </div>
  );
}
