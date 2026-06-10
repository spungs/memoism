import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DiaryContent } from "@/components/diary/diary-content";
import { DiaryDetailActions } from "@/components/diary/diary-detail-actions";
import { MoodBadge } from "@/components/diary/mood-badge";
import { getSession } from "@/lib/auth/session";
import { getDiary } from "@/lib/diary/queries";
import { getSignedUrls } from "@/lib/storage";

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});
const weekdayFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  weekday: "long",
});

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return { title: "일기" };
  const diary = await getDiary(id, session.userId);
  return { title: diary?.title || "일기" };
}

export default async function DiaryDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const diary = await getDiary(id, session.userId);
  if (!diary) notFound();

  const date = diary.createdAt;
  const isAiSource = diary.source?.startsWith("auto_") ?? false;

  // DiaryImage signed URL 일괄 발급 (1h TTL). 실패한 항목은 null.
  const imagePaths = diary.images.map((img) => img.storagePath);
  const imageUrls =
    imagePaths.length > 0 ? await getSignedUrls(imagePaths) : [];

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
      }}
    >
      <header
        className="glass"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 var(--space-2)",
          height: 52,
          borderBottom: "1px solid var(--separator)",
        }}
      >
        <Link
          href="/diary"
          aria-label="목록으로"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "0 var(--space-2)",
            height: 44,
            borderRadius: "var(--radius-md)",
            color: "var(--tint)",
            textDecoration: "none",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
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
        {/* 날짜·요일 메타 — 13px tertiary */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginBottom: "var(--space-4)",
            flexWrap: "wrap",
          }}
        >
          <time
            dateTime={date.toISOString()}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fg-placeholder)",
            }}
          >
            {dateFmt.format(date)} · {weekdayFmt.format(date)}
          </time>
          {diary.mood && <MoodBadge mood={diary.mood} />}
        </div>

        {diary.title && (
          <h1
            style={{
              margin: "0 0 var(--space-5) 0",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--fg)",
              letterSpacing: "var(--tracking-tight)",
              lineHeight: "var(--leading-snug)",
            }}
          >
            {diary.title}
          </h1>
        )}

        {imageUrls.length > 0 && (
          <div
            className="hide-scrollbar"
            style={{
              display: "flex",
              gap: "var(--space-2)",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              marginBottom: "var(--space-5)",
              // 카드 좌우 여백 살짝 넘기게 (피크) — 화면 끝에 다음 사진 살짝 보임
              marginLeft: "calc(var(--space-5) * -1)",
              marginRight: "calc(var(--space-5) * -1)",
              paddingLeft: "var(--space-5)",
              paddingRight: "var(--space-5)",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {imageUrls.map((url, i) =>
              url ? (
                <div
                  key={diary.images[i].id}
                  style={{
                    position: "relative",
                    flexShrink: 0,
                    width: imageUrls.length === 1 ? "100%" : "min(78%, 280px)",
                    aspectRatio: "1 / 1",
                    overflow: "hidden",
                    borderRadius: "var(--radius-lg)",
                    backgroundColor: "var(--fill-2)",
                    scrollSnapAlign: "start",
                  }}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="(max-width: 720px) 78vw, 280px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ) : null,
            )}
          </div>
        )}

        {/* ✨ AI 칩 — fill-2 배경 + secondary 글자, 무채색으로 후퇴 */}
        {isAiSource && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--fg-muted)",
              backgroundColor: "var(--fill-2)",
              padding: "3px 8px",
              borderRadius: "var(--radius-pill)",
              marginBottom: "var(--space-3)",
            }}
          >
            ✨ AI
          </span>
        )}

        <DiaryContent>{diary.content}</DiaryContent>
      </article>
    </main>
  );
}
