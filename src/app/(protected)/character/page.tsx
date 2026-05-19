import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// Phase 4 MIG-8에서 친구 페르소나 + RAG 채팅 인터페이스로 재작성 예정.
// 현재는 placeholder.
export default async function CharacterPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const character = await prisma.character.findUnique({
    where: { userId: session.userId },
  });

  if (!character) redirect("/login");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100svh - 56px)",
        padding: "var(--space-8)",
        textAlign: "center",
        color: "var(--fg-subtle)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-xl)",
          color: "var(--fg)",
          margin: 0,
        }}
      >
        {character.name}
      </p>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          marginTop: "var(--space-2)",
        }}
      >
        준비 중이에요
      </p>
    </div>
  );
}
