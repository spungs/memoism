import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const character = await prisma.character.findUnique({
    where: { userId: session.userId },
    select: { name: true, bornAt: true },
  });
  if (!character) redirect("/login");

  return (
    <SettingsView
      email={session.email}
      characterName={character.name}
      bornAt={character.bornAt.toISOString()}
    />
  );
}
