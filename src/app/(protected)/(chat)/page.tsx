import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CharacterChat } from "@/components/character/character-chat";
import { CHARACTER_NAME } from "@/lib/character/utils";
import { todayAiCallCount, usageFromCount } from "@/lib/ai/usage";

export const metadata = { title: "메이" };

type RelatedDiary = { id: string; title: string; createdAt: string };

/**
 * 랜딩 = 메이(메신저). old 홈은 해체됐다(스펙 §7).
 *
 * `/character`가 아니라 `/`인 이유: PWA start_url이 "/"이고 로그인·가입 성공과
 * 미들웨어의 로그인 페이지 되돌리기가 모두 "/"로 온다. 랜딩을 여기 두면
 * 콜드 스타트마다 리다이렉트 홉을 물지 않는다.
 *
 * 홈에 있던 "이번 달 / 모은 기록" 안심 지표는 기록 탭 상단으로 이사했다
 * (components/diary/diary-summary-stats.tsx).
 */
export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [character, recentChat, aiCallCount] = await Promise.all([
    prisma.character.findUnique({
      where: { userId: session.userId },
      select: {
        id: true,
        chatResetAt: true,
        subscriptionStatus: true,
        plan: true,
        photoVisionOptIn: true,
      },
    }),
    // 표시는 영구 저장된 대화를 그대로 보여준다 (24h 삭제 폐기 — 어젯밤 대화가 사라지면
    // "하룻밤 새 잊은 친구"처럼 차갑다). 최신 100개만 초기 로드. 모델 컨텍스트용 24h 쿼리는
    // route.ts에 따로 있어 '표시'와 '맥락'은 분리돼 있다.
    prisma.chatMessage.findMany({
      where: {
        userId: session.userId,
        role: { in: ["USER", "ASSISTANT"] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        relatedDiaries: true,
        captureRef: true,
      },
    }),
    // 등급과 무관한 쿼리라 character를 기다릴 이유가 없다 — 나란히 보낸다.
    todayAiCallCount(session.userId),
  ]);

  if (!character) redirect("/login");

  // 오늘 한도 소진 여부를 로드 시점에 함께 내려준다 → 새로고침해도 입력창이 "열린 척"
  // 하지 않고 즉시 비활성. 조회는 위에서 병렬로 끝났고 여기선 등급을 얹어 계산만 한다.
  const usage = usageFromCount(
    aiCallCount,
    character.subscriptionStatus,
    character.plan,
  );
  const initialCapExhausted = usage.remaining <= 0;

  const initialMessages = recentChat
    .slice()
    .reverse() // 최신순 조회 → 시간순(오래된→최신) 표시
    .map((m) => ({
      id: m.id,
      role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      relatedDiaries:
        (m.relatedDiaries as unknown as RelatedDiary[] | null) ?? undefined,
      captureRef:
        (m.captureRef as unknown as {
          diaryId: string;
          dateKey: string;
          label: string;
          // 구버전 행엔 없다 — 옵셔널로 둬야 옛 칩이 깨지지 않는다.
          entries?: { dateKey: string; diaryId: string; imageIds: string[] }[];
          fragmentId?: string | null;
        } | null) ?? undefined,
    }));

  return (
    <CharacterChat
      characterName={CHARACTER_NAME}
      initialMessages={initialMessages}
      initialBoundaryAt={character.chatResetAt?.toISOString() ?? null}
      initialCapExhausted={initialCapExhausted}
      initialPhotoVisionOptIn={character.photoVisionOptIn}
    />
  );
}
