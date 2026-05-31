import { redirect } from "next/navigation";
import { DiaryForm } from "@/components/diary/diary-form";
import { getSession } from "@/lib/auth/session";
import { getMaxImagesForUser } from "@/lib/character/queries";
import { kstTodayKey } from "@/lib/diary/kst";

export const metadata = { title: "새 일기" };

export default async function NewDiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const maxImages = await getMaxImagesForUser(session.userId);

  // 캘린더 빈 날 탭에서 ?date=YYYY-MM-DD로 들어옴. 형식 + 미래 아님 검증.
  const { date } = await searchParams;
  const validDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= kstTodayKey()
      ? date
      : undefined;

  return (
    <DiaryForm
      mode="create"
      maxImages={maxImages}
      initial={
        validDate ? { title: "", content: "", mood: null, date: validDate } : undefined
      }
    />
  );
}
