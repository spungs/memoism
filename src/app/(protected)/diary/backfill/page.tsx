import { redirect } from "next/navigation";
import { BackfillClient } from "@/components/diary/backfill-client";
import { PageHeader } from "@/components/layout/page-header";
import { BackButton } from "@/components/nav/back-button";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "밀린 날 채우기" };

export default async function DiaryBackfillPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        padding: "0 var(--space-4) var(--space-12)",
      }}
    >
      <PageHeader title="밀린 날 채우기" leading={<BackButton />} />
      <BackfillClient />
    </div>
  );
}
