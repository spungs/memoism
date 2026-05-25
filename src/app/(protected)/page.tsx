import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  getDiaryCounts,
  getRecentDiaries,
  getTodayDiary,
} from "@/lib/diary/queries";

// MIG-12 홈 재배치. 적은 일기 수에도 비어 보이지 않게:
//   - 상단 헤더 (메모이즘 + 오늘 날짜)
//   - "오늘의 일기" 위젯 (있으면 카드, 없으면 "오늘 첫 줄 시작해볼까?" CTA)
//   - "이번 달" 요약 strip (이번 달 / 전체 기록 수) — 적어도 모은 기록을 안심시키는 단서
//   - 최근 일기 6개 (날짜·요일·AI칩·2줄 발췌·썸네일 — /diary 카드와 동일 어휘)

const todayLabelFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
});
const dayFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
});
const weekdayFmt = new Intl.DateTimeFormat("ko-KR", { weekday: "short" });

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100svh - 56px)",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* 헤더 */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-4) var(--space-5)",
          paddingTop: "calc(var(--space-4) + env(safe-area-inset-top))",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-xl)",
            color: "var(--accent-rose-deep)",
            margin: 0,
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          메모이즘
        </h1>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-subtle)",
          }}
        >
          {todayLabelFmt.format(new Date())}
        </span>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
          padding: "var(--space-2) var(--space-5) var(--space-8)",
        }}
      >
        {/* 오늘의 일기 위젯 */}
        {todayDiary ? (
          <Link
            href={`/diary/${todayDiary.id}`}
            style={{
              display: "flex",
              gap: "var(--space-4)",
              alignItems: "stretch",
              padding: "var(--space-4) var(--space-5)",
              backgroundColor: "var(--surface-raised, var(--surface))",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-paper, var(--shadow-xs))",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--accent-rose-deep)",
                  letterSpacing: "var(--tracking-wider)",
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: 4,
                  textTransform: "uppercase",
                }}
              >
                오늘의 일기
              </p>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-md)",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--fg)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {todayDiary.title || "(제목 없음)"}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-sm)",
                  color: "var(--fg-muted)",
                  margin: "var(--space-2) 0 0 0",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: "var(--leading-relaxed)",
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
                  width: 72,
                  height: 72,
                  flexShrink: 0,
                  overflow: "hidden",
                  borderRadius: "var(--radius-md)",
                  alignSelf: "center",
                  backgroundColor: "var(--bg)",
                }}
              >
                <Image
                  src={todayDiary.thumbnailUrl}
                  alt=""
                  fill
                  sizes="72px"
                  style={{ objectFit: "cover" }}
                />
              </div>
            )}
          </Link>
        ) : (
          <Link
            href="/diary/new"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-8) var(--space-5)",
              backgroundColor: "var(--surface)",
              border: "1px dashed var(--border-strong, var(--border))",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              color: "inherit",
              textAlign: "center",
            }}
          >
            <span aria-hidden style={{ fontSize: 28, lineHeight: 1 }}>
              ✍️
            </span>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-subtle)",
                letterSpacing: "var(--tracking-wider)",
                fontWeight: 600,
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              오늘의 일기
            </p>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-lg)",
                color: "var(--fg)",
                margin: 0,
              }}
            >
              오늘 첫 줄, 시작해볼까?
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-subtle)",
                margin: 0,
              }}
            >
              사진만 있어도, 텍스트만 있어도 AI가 정리해줘요.
            </p>
          </Link>
        )}

        {/* 이번 달 요약 strip */}
        {hasAny && (
          <section
            aria-label="기록 요약"
            style={{
              display: "flex",
              alignItems: "stretch",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-xs)",
              overflow: "hidden",
            }}
          >
            <SummaryStat label="이번 달" value={counts.thisMonth} />
            <div
              aria-hidden
              style={{ width: 1, backgroundColor: "var(--border)" }}
            />
            <SummaryStat label="모은 기록" value={counts.total} />
          </section>
        )}

        {/* 최근 일기 */}
        {otherRecent.length > 0 ? (
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-3)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--fg-subtle)",
                  fontWeight: 700,
                  letterSpacing: "var(--tracking-wider)",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                최근 일기
              </h2>
              <Link
                href="/diary"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  color: "var(--accent-rose)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                전체 보기 →
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {otherRecent.map((diary) => {
                const date = new Date(diary.createdAt);
                const isAi = diary.source?.startsWith("auto_") ?? false;
                const previewTitle =
                  diary.title?.trim() ||
                  diary.content.split("\n")[0].slice(0, 40) ||
                  "(제목 없음)";
                return (
                  <Link
                    key={diary.id}
                    href={`/diary/${diary.id}`}
                    style={{
                      display: "block",
                      padding: "var(--space-4) var(--space-5)",
                      backgroundColor: "var(--surface)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      textDecoration: "none",
                      color: "inherit",
                      boxShadow: "var(--shadow-xs)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)",
                        color: "var(--fg-subtle)",
                        letterSpacing: "var(--tracking-wide)",
                      }}
                    >
                      <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>
                        📝
                      </span>
                      <time
                        dateTime={date.toISOString()}
                        style={{ fontWeight: 600 }}
                      >
                        {dayFmt.format(date)}
                      </time>
                      <span style={{ opacity: 0.6 }}>·</span>
                      <span>{weekdayFmt.format(date)}요일</span>
                      {isAi && (
                        <span
                          title="AI가 정리한 일기"
                          style={{
                            marginLeft: 2,
                            fontSize: 10,
                            padding: "1px 7px",
                            borderRadius: "var(--radius-pill)",
                            backgroundColor:
                              "color-mix(in srgb, var(--accent-rose) 14%, transparent)",
                            color: "var(--accent-rose-deep, var(--accent-rose))",
                            fontWeight: 700,
                            letterSpacing: "var(--tracking-wide)",
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <span aria-hidden>✨</span>AI
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: "var(--space-2) 0 0 0",
                        fontFamily: "var(--font-serif)",
                        fontSize: "var(--text-base)",
                        lineHeight: "var(--leading-relaxed)",
                        color: "var(--fg)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {snippet(diary.content) || previewTitle}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          hasAny && (
            // 오늘 일기는 있지만 그 외 기록이 없는 경우 — 잔잔한 격려
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-subtle)",
                textAlign: "center",
                margin: "var(--space-4) 0",
                lineHeight: "var(--leading-relaxed)",
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
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-2xl)",
          fontWeight: 600,
          color: "var(--fg)",
          lineHeight: 1.1,
        }}
      >
        {value}
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-subtle)",
            fontWeight: 500,
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
          color: "var(--fg-subtle)",
          letterSpacing: "var(--tracking-wider)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}
