import { BottomNav } from '@/components/nav/bottom-nav'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <main style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
        {children}
      </main>
      <BottomNav />
    </>
  )
}
