import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { DiaryList } from "@/components/diary/diary-list";
import { getSession } from "@/lib/auth/session";
import { getDiaries } from "@/lib/diary/queries";

export const metadata = { title: "일기" };

export default async function DiaryListPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const page = await getDiaries(session.userId, { take: 50 });
  const initialData = {
    nextCursor: page.nextCursor,
    items: page.items.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      images: d.images,
      mood: d.mood,
      createdAt: d.createdAt.toISOString(),
    })),
  };

  const total = initialData.items.length;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        padding: "var(--space-5) var(--space-4) var(--space-12)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
          padding: "0 var(--space-1)",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-2xl)",
              color: "var(--fg)",
              fontWeight: 600,
              letterSpacing: "var(--tracking-tight)",
              lineHeight: 1.1,
            }}
          >
            일기
          </h1>
          <p
            style={{
              margin: "var(--space-1) 0 0 0",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-subtle)",
              letterSpacing: "var(--tracking-wide)",
            }}
          >
            총 {total}개
          </p>
        </div>
        <Link
          href="/diary/new"
          aria-label="새 일기 쓰기"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--fg)",
            color: "var(--bg)",
            textDecoration: "none",
            boxShadow: "var(--shadow-sm)",
            transition: "transform var(--duration-fast, 120ms) var(--ease-out, ease)",
          }}
        >
          <Pencil size={18} aria-hidden />
        </Link>
      </header>

      <DiaryList initialData={initialData} />
    </main>
  );
}
