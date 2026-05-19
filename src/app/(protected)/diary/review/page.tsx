import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ReviewGate } from "@/components/diary/review-gate";

export const metadata = { title: "AI 일기 검토" };

export default async function DiaryReviewPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ReviewGate />;
}
