import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CharacterChat } from "@/components/character/character-chat";
import { CHARACTER_NAME } from "@/lib/character/utils";

export const metadata = { title: "메이" };

type RelatedDiary = { id: string; title: string; createdAt: string };

export default async function CharacterPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [character, recentChat] = await Promise.all([
    prisma.character.findUnique({
      where: { userId: session.userId },
      select: { id: true, chatResetAt: true },
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
      },
    }),
  ]);

  if (!character) redirect("/login");

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
    }));

  return (
    <CharacterChat
      characterName={CHARACTER_NAME}
      initialMessages={initialMessages}
      initialBoundaryAt={character.chatResetAt?.toISOString() ?? null}
    />
  );
}
