import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CharacterChat } from "@/components/character/character-chat";
import { CHARACTER_NAME } from "@/lib/character/utils";

export const metadata = { title: "친구" };

export default async function CharacterPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [character, recentChat] = await Promise.all([
    prisma.character.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    }),
    prisma.chatMessage.findMany({
      where: {
        userId: session.userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        role: { in: ["USER", "ASSISTANT"] },
      },
      orderBy: { createdAt: "asc" },
      take: 40,
      select: { id: true, role: true, content: true },
    }),
  ]);

  if (!character) redirect("/login");

  const initialMessages = recentChat.map((m) => ({
    id: m.id,
    role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));

  return (
    <CharacterChat
      characterName={CHARACTER_NAME}
      initialMessages={initialMessages}
    />
  );
}
