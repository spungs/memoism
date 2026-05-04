import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiaryCard } from "@/components/diary/diary-card";
import { logoutAction } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";
import { getRecentDiaries } from "@/lib/diary/queries";

export default async function HomePage() {
  // Middleware already enforces auth, but read the session here so this page
  // renders the user's email and stays correct if middleware is ever bypassed.
  const session = await getSession();
  if (!session) redirect("/login");

  const recent = await getRecentDiaries(session.userId, 3);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Memoism</h1>
          <p className="text-sm text-muted-foreground">{session.email}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </header>

      <section className="space-y-3">
        <Link href="/diary/new" className="block">
          <Button className="w-full" size="lg">
            <Pencil className="mr-2 h-4 w-4" />
            일기 쓰기
          </Button>
        </Link>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">최근 일기</h2>
          <Link
            href="/diary"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            전체 보기
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              아직 일기가 없어요. 첫 일기를 써보세요.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recent.map((d) => (
              <li key={d.id}>
                <DiaryCard
                  diary={{
                    id: d.id,
                    title: d.title,
                    content: d.content,
                    createdAt: d.createdAt,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
