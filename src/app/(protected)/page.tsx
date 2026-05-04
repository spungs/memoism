import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";

export default async function HomePage() {
  // Middleware already enforces auth, but read the session here so this page
  // renders the user's email and stays correct if middleware is ever bypassed.
  const session = await getSession();
  if (!session) redirect("/login");

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

      <section className="flex flex-1 items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          오늘의 일기를 작성해보세요.
        </p>
      </section>
    </main>
  );
}
