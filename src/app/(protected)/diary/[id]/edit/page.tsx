import { notFound, redirect } from "next/navigation";
import { DiaryForm } from "@/components/diary/diary-form";
import { getSession } from "@/lib/auth/session";
import { getMaxImagesForUser } from "@/lib/character/queries";
import { getDiary } from "@/lib/diary/queries";
import { kstDateKey } from "@/lib/diary/kst";
import { moodKeySchema, type MoodKey } from "@/lib/diary/schemas";
import { getSignedUrls } from "@/lib/storage";

export const metadata = { title: "일기 수정" };

interface PageProps {
  params: Promise<{ id: string }>;
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

  const maxImages = await getMaxImagesForUser(session.userId);

  // createdAt(UTC instant)을 KST 날짜로 변환해 date picker에 채운다.
  // toISOString().slice(0,10)은 UTC 날짜라 자정 직후 일기가 하루 밀려 채워졌다.
  const diaryDate = kstDateKey(diary.createdAt);

  // 기존 사진들의 signed URL 발급 (edit 모드 표시 + 개별 제거용).
  // id와 signed URL을 짝지어 전달하고, URL 발급 실패(null)한 항목은 제외한다.
  const imagePaths = diary.images.map((img) => img.storagePath);
  const signedUrls =
    imagePaths.length > 0 ? await getSignedUrls(imagePaths) : [];
  const existingImages = diary.images
    .map((img, i) => ({
      id: img.id,
      url: signedUrls[i],
      exifTakenAt: img.exifTakenAt,
    }))
    .filter(
      (entry): entry is { id: string; url: string; exifTakenAt: Date | null } =>
        entry.url !== null,
    );

  return (
    <DiaryForm
      mode="edit"
      diaryId={diary.id}
      maxImages={maxImages}
      initial={{
        title: diary.title,
        content: diary.content,
        existingImages,
        hasPreviousContent: diary.previousContent !== null,
        aiGenerationVersion: diary.aiGenerationVersion,
        mood: parseStoredMood(diary.mood),
        date: diaryDate,
      }}
    />
  );
}
