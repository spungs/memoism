import { notFound, redirect } from "next/navigation";
import { DiaryForm } from "@/components/diary/diary-form";
import { getSession } from "@/lib/auth/session";
import { getDiary } from "@/lib/diary/queries";
import {
  locationSchema,
  moodKeySchema,
  type DiaryLocation,
  type MoodKey,
} from "@/lib/diary/schemas";

export const metadata = { title: "일기 수정" };

interface PageProps {
  params: Promise<{ id: string }>;
}

function parseStoredLocation(value: unknown): DiaryLocation | null {
  if (!value || typeof value !== "object") return null;
  const parsed = locationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseStoredMood(value: unknown): MoodKey | null {
  if (typeof value !== "string") return null;
  const parsed = moodKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export default async function DiaryEditPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const diary = await getDiary(id, session.userId);
  if (!diary) notFound();

  const diaryDate = diary.createdAt.toISOString().slice(0, 10);

  return (
    <DiaryForm
      mode="edit"
      diaryId={diary.id}
      initial={{
        title: diary.title,
        content: diary.content,
        // Phase 3 MIG-3에서 DiaryImage 1:N으로 다중 이미지 첨부. 베타 stub은 빈 배열.
        images: [],
        location: parseStoredLocation(diary.location),
        mood: parseStoredMood(diary.mood),
        date: diaryDate,
      }}
    />
  );
}
