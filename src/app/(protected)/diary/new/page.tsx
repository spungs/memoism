import { redirect } from "next/navigation";
import { DiaryForm } from "@/components/diary/diary-form";
import { getSession } from "@/lib/auth/session";
import { isValidDateKey, todayKeyInZone } from "@/lib/tz";
import { getRequestTimeZone } from "@/lib/tz-server";

export const metadata = { title: "새 일기" };

export default async function NewDiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // 캘린더 빈 날 탭에서 ?date=YYYY-MM-DD로 들어옴. 형식 + 미래 아님 검증.
  const { date } = await searchParams;
  const validDate =
    date && isValidDateKey(date) && date <= todayKeyInZone(await getRequestTimeZone())
      ? date
      : undefined;

  return (
    <DiaryForm
      mode="create"
      initial={
        validDate ? { title: "", content: "", mood: null, date: validDate } : undefined
      }
    />
  );
}
