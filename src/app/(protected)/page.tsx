import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRecentDiaries, getTodayDiary } from "@/lib/diary/queries";

// MIG-11 홈 재배치. 베타 베어 본본:
//   - 상단 헤더 (메모이즘 + 오늘 날짜)
//   - AI 작성 진입 CTA 카드
//   - "오늘의 일기" 위젯 (있으면 카드, 없으면 "오늘 첫 줄 시작해볼까?" CTA)
//   - 최근 일기 3개

const todayLabelFmt = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

function snippet(content: string, n = 80): string {
  const plain = content.replace(/\s+/g, " ").trim();
  return plain.length > n ? `${plain.slice(0, n)}…` : plain;
}

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [todayDiary, recentDiaries] = await Promise.all([
    getTodayDiary(session.userId),
    getRecentDiaries(session.userId, 3),
  ]);

  // 최근 일기에서 오늘 일기는 중복 제거
  const otherRecent = todayDiary
    ? recentDiaries.filter((d) => d.id !== todayDiary.id)
    : recentDiaries;

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
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
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
                  fontSize: "var(--text-base)",
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
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  color: "var(--fg-subtle)",
                  margin: "4px 0 0 0",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: "var(--leading-snug)",
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
              padding: "var(--space-6) var(--space-5)",
              backgroundColor: "var(--surface)",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              color: "inherit",
              textAlign: "center",
            }}
          >
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

        {/* 최근 일기 */}
        {otherRecent.length > 0 && (
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
                gap: "var(--space-2)",
              }}
            >
              {otherRecent.map((diary) => {
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
                      padding: "var(--space-3) var(--space-4)",
                      backgroundColor: "var(--surface)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      textDecoration: "none",
                      boxShadow: "var(--shadow-xs)",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "var(--text-sm)",
                        color: "var(--fg)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {previewTitle}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)",
                        color: "var(--fg-subtle)",
                        margin: "2px 0 0",
                      }}
                    >
                      {new Date(diary.createdAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
