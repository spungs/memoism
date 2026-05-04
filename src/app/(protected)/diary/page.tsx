import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiaryList } from "@/components/diary/diary-list";
import { getSession } from "@/lib/auth/session";
import { getDiaries } from "@/lib/diary/queries";

export const metadata = { title: "일기" };

export default async function DiaryListPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const page = await getDiaries(session.userId, { take: 50 });
  // Serialize Date → ISO so client component receives a JSON-compatible shape
  // matching what /api/diaries returns.
  const initialData = {
    nextCursor: page.nextCursor,
    items: page.items.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      images: d.images,
      createdAt: d.createdAt.toISOString(),
    })),
  };

  return (
    <main className="flex min-h-screen flex-col p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">일기</h1>
        <Link href="/">
          <Button variant="ghost" size="sm">
            홈
          </Button>
        </Link>
      </header>

      <div className="flex-1">
        <DiaryList initialData={initialData} />
      </div>

      <Link
        href="/diary/new"
        aria-label="새 일기 쓰기"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 sm:right-[calc(50%-215px+24px)]"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </main>
  );
}
