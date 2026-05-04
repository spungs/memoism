import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiaryContent } from "@/components/diary/diary-content";
import {
  MOOD_EMOJI,
  MOOD_LABEL,
  type MoodKey,
} from "@/components/diary/mood-picker";
import { getSession } from "@/lib/auth/session";
import { getDiary } from "@/lib/diary/queries";

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
});

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

  const cover = diary.images[0];
  const moodKey =
    diary.mood && diary.mood in MOOD_EMOJI ? (diary.mood as MoodKey) : null;

  return (
    <main className="flex min-h-screen flex-col p-4">
      <header className="mb-4 flex items-center justify-between">
        <Link
          href="/diary"
          aria-label="목록으로"
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link href={`/diary/${diary.id}/edit`}>
          <Button variant="ghost" size="sm">
            <Pencil className="mr-1 h-4 w-4" />
            수정
          </Button>
        </Link>
      </header>

      <article className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{diary.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <time>{dateFmt.format(diary.createdAt)}</time>
            {moodKey && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs"
                aria-label={`감정: ${MOOD_LABEL[moodKey]}`}
              >
                <span aria-hidden>{MOOD_EMOJI[moodKey]}</span>
                <span>{MOOD_LABEL[moodKey]}</span>
              </span>
            )}
          </div>
        </div>

        {cover && (
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
            <Image
              src={cover}
              alt=""
              fill
              sizes="(max-width: 430px) 100vw, 430px"
              className="object-cover"
            />
          </div>
        )}

        <DiaryContent>{diary.content}</DiaryContent>
      </article>
    </main>
  );
}
