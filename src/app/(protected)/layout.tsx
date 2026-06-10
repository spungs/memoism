import { getSession } from '@/lib/auth/session'
import { Identifier } from '@/components/analytics/identifier'
import { BottomNav } from '@/components/nav/bottom-nav'
import { PageTransition } from '@/components/layout/page-transition'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <>
      <main style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
      {session ? (
        <Identifier userId={session.userId} email={session.email} />
      ) : null}
    </>
  )
}
