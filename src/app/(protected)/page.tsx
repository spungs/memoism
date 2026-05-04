import Link from "next/link";
import { redirect } from "next/navigation";
import { CharacterCard } from "@/components/character/character-card";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getRecentDiaries } from "@/lib/diary/queries";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [character, recentDiaries, diaryCount] = await Promise.all([
    prisma.character.findUnique({ where: { userId: session.userId } }),
    getRecentDiaries(session.userId, 3),
    prisma.diary.count({ where: { userId: session.userId } }),
  ]);

  if (!character) redirect("/login");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100svh - 56px)",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* 상단 헤더 */}
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
          {new Date().toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </span>
      </header>

      {/* 캐릭터 섹션 — 헤더와 (있다면) 최근 일기 사이를 채워 세로 중앙 정렬 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: recentDiaries.length > 0 ? 0 : "var(--space-8)",
        }}
      >
        <CharacterCard character={character} diaryCount={diaryCount} />
      </div>

      {/* 최근 일기 */}
      {recentDiaries.length > 0 && (
        <section style={{ padding: "0 var(--space-5) var(--space-4)" }}>
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
                fontSize: "var(--text-sm)",
                color: "var(--fg-subtle)",
                fontWeight: 600,
                letterSpacing: "var(--tracking-wider)",
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
              }}
            >
              전체 보기
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            {recentDiaries.map((diary) => {
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
  );
}
