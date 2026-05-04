import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { CharacterChatView } from '@/components/character/character-chat-view'

export default async function CharacterPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [character, diaryCount, messages] = await Promise.all([
    prisma.character.findUnique({ where: { userId: session.userId } }),
    prisma.diary.count({ where: { userId: session.userId } }),
    prisma.chatMessage.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    }),
  ])

  if (!character) redirect('/login')

  return (
    <CharacterChatView
      character={{
        ...character,
        bornAt: character.bornAt.toISOString(),
        trialStartedAt: character.trialStartedAt?.toISOString() ?? null,
        subscriptionExpiresAt: character.subscriptionExpiresAt?.toISOString() ?? null,
        createdAt: character.createdAt.toISOString(),
        updatedAt: character.updatedAt.toISOString(),
      }}
      diaryCount={diaryCount}
      initialMessages={messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  )
}
