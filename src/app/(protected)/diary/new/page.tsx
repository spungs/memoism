import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DiaryForm } from "@/components/diary/diary-form";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "새 일기" };

export default async function NewDiaryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col p-4">
      <header className="mb-4 flex items-center gap-2">
        <Link
          href="/diary"
          aria-label="목록으로"
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">새 일기</h1>
      </header>
      <DiaryForm mode="create" />
    </main>
  );
}
