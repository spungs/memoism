import { redirect } from "next/navigation";
import { DiaryForm } from "@/components/diary/diary-form";
import { getSession } from "@/lib/auth/session";
import { getMaxImagesForUser } from "@/lib/character/queries";

export const metadata = { title: "새 일기" };

export default async function NewDiaryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const maxImages = await getMaxImagesForUser(session.userId);

  return <DiaryForm mode="create" maxImages={maxImages} />;
}
