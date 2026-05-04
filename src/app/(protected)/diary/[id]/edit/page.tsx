import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DiaryForm } from "@/components/diary/diary-form";
import { getSession } from "@/lib/auth/session";
import { getDiary } from "@/lib/diary/queries";
import type { DiaryLocation } from "@/lib/diary/schemas";
import { locationSchema } from "@/lib/diary/schemas";

export const metadata = { title: "일기 수정" };

interface PageProps {
  params: Promise<{ id: string }>;
}

function parseStoredLocation(value: unknown): DiaryLocation | null {
  if (!value || typeof value !== "object") return null;
  const parsed = locationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export default async function DiaryEditPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const diary = await getDiary(id, session.userId);
  if (!diary) notFound();

  return (
    <main className="flex min-h-screen flex-col p-4">
      <header className="mb-4 flex items-center gap-2">
        <Link
          href={`/diary/${diary.id}`}
          aria-label="돌아가기"
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">일기 수정</h1>
      </header>
      <DiaryForm
        mode="edit"
        diaryId={diary.id}
        initial={{
          title: diary.title,
          content: diary.content,
          images: diary.images,
          location: parseStoredLocation(diary.location),
        }}
      />
    </main>
  );
}
