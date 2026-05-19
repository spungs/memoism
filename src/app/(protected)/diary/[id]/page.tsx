import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DiaryContent } from "@/components/diary/diary-content";
import { DiaryDetailActions } from "@/components/diary/diary-detail-actions";
import { MoodBadge } from "@/components/diary/mood-badge";
import { getSession } from "@/lib/auth/session";
import { getDiary } from "@/lib/diary/queries";

// Phase 3 MIG-3 진입 전까지 다중 이미지 표시(DiaryImage[]) 임시 비활성화.

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const weekdayFmt = new Intl.DateTimeFormat("ko-KR", { weekday: "long" });

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return { title: "일기" };
  const diary = await getDiary(id, session.userId);
  return { title: diary?.title ?? "일기" };
}

export default async function DiaryDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const diary = await getDiary(id, session.userId);
  if (!diary) notFound();

  const date = diary.createdAt;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3) var(--space-4)",
          backgroundColor: "var(--surface-raised)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "saturate(140%) blur(8px)",
        }}
      >
        <Link
          href="/diary"
          aria-label="목록으로"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            borderRadius: "var(--radius-md)",
            color: "var(--fg-muted)",
            textDecoration: "none",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
          }}
        >
          <ArrowLeft size={16} aria-hidden />
          뒤로
        </Link>
        <DiaryDetailActions diaryId={diary.id} />
      </header>

      <article
        style={{
          padding: "var(--space-6) var(--space-5) var(--space-12)",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            marginBottom: "var(--space-5)",
            flexWrap: "wrap",
          }}
        >
          {diary.mood ? (
            <MoodBadge mood={diary.mood} />
          ) : (
            <span aria-hidden style={{ width: 1 }} />
          )}
          <time
            dateTime={date.toISOString()}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-subtle)",
              letterSpacing: "var(--tracking-wide)",
            }}
          >
            {dateFmt.format(date)} · {weekdayFmt.format(date)}
          </time>
        </div>

        {diary.title && (
          <h1
            style={{
              margin: "0 0 var(--space-5) 0",
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-2xl)",
              fontWeight: 600,
              color: "var(--fg)",
              letterSpacing: "var(--tracking-tight)",
              lineHeight: "var(--leading-snug)",
            }}
          >
            {diary.title}
          </h1>
        )}

        <DiaryContent>{diary.content}</DiaryContent>
      </article>
    </main>
  );
}
