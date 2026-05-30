import { getSession } from '@/lib/auth/session'
import { Identifier } from '@/components/analytics/identifier'
import { BottomNav } from '@/components/nav/bottom-nav'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <>
      <main style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        {children}
      </main>
      <BottomNav />
      {session ? (
        <Identifier userId={session.userId} email={session.email} />
      ) : null}
    </>
  )
}
