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

  // 기존 사진들의 signed URL 발급 (edit 모드 표시 + 개별 제거용).
  // id와 signed URL을 짝지어 전달하고, URL 발급 실패(null)한 항목은 제외한다.
  const imagePaths = diary.images.map((img) => img.storagePath);
  const signedUrls =
    imagePaths.length > 0 ? await getSignedUrls(imagePaths) : [];
  const existingImages = diary.images
    .map((img, i) => ({ id: img.id, url: signedUrls[i] }))
    .filter((entry): entry is { id: string; url: string } => entry.url !== null);

  return (
    <DiaryForm
      mode="edit"
      diaryId={diary.id}
      initial={{
        title: diary.title,
        content: diary.content,
        existingImages,
        hasPreviousContent: diary.previousContent !== null,
        aiGenerationVersion: diary.aiGenerationVersion,
        location: parseStoredLocation(diary.location),
        mood: parseStoredMood(diary.mood),
        date: diaryDate,
      }}
    />
  );
}
