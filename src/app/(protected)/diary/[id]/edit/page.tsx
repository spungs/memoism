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
import { getSignedUrls } from "@/lib/storage";

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

  // 기존 사진들의 signed URL 발급 (edit 모드 read-only 표시용).
  // 사진 수정 자체는 Phase 3c-4 NEW-7 백업 스왑과 함께 본격 지원.
  const imagePaths = diary.images.map((img) => img.storagePath);
  const existingImageUrls =
    imagePaths.length > 0
      ? (await getSignedUrls(imagePaths)).filter(
          (u): u is string => u !== null,
        )
      : [];

  return (
    <DiaryForm
      mode="edit"
      diaryId={diary.id}
      initial={{
        title: diary.title,
        content: diary.content,
        existingImageUrls,
        location: parseStoredLocation(diary.location),
        mood: parseStoredMood(diary.mood),
        date: diaryDate,
      }}
    />
  );
}
