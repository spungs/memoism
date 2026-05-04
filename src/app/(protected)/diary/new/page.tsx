import { redirect } from "next/navigation";
import { DiaryForm } from "@/components/diary/diary-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "새 일기" };

export default async function NewDiaryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <DiaryForm mode="create" />;
}
