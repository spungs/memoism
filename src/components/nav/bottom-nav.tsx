'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useScrolled } from '@/lib/use-scrolled'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  exact?: boolean
}

const MeiIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  </svg>
)

const RecordIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const ComposeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

// 스펙 §7: 하단은 2탭(메이 | 기록) + 가운데 (+). 설정은 각 화면 우상단으로,
// 메이는 랜딩(/)으로 승격됐다.
const navItems: NavItem[] = [
  { href: '/', label: '메이', icon: <MeiIcon />, exact: true },
]

const rightNavItems: NavItem[] = [
  { href: '/diary', label: '기록', icon: <RecordIcon /> },
]

/**
 * iOS 탭바 관습: 블러 유리 재질(.glass) + 상단 헤어라인, 활성=틴트·비활성=tertiary.
 * 가운데 + 버튼은 작성 진입의 글로벌 단축 (틴트 원형, press 스프링).
 */
export function BottomNav() {
  const pathname = usePathname()
  const scrolled = useScrolled()

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  return (
    <nav
      className={scrolled ? 'glass is-scrolled' : 'glass'}
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 'var(--container-mobile)',
        borderTop: '1px solid var(--separator)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 52,
          padding: '0 8px',
        }}
      >
        {navItems.map((item) => (
          <NavTab key={item.href} item={item} active={isActive(item)} />
        ))}

        <Link
          href="/diary/new"
          className="pressable"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 46,
            height: 46,
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--tint)',
            color: 'var(--on-tint)',
            flex: '0 0 auto',
            margin: '0 8px',
            boxShadow: 'var(--shadow-sm)',
          }}
          aria-label="새 일기 작성"
        >
          <ComposeIcon />
        </Link>

        {rightNavItems.map((item) => (
          <NavTab key={item.href} item={item} active={isActive(item)} />
        ))}
      </div>
    </nav>
  )
}

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: '100%',
        minHeight: 'var(--touch-target)',
        color: active ? 'var(--tint)' : 'var(--fg-placeholder)',
        textDecoration: 'none',
        transition: 'color var(--duration-fast) var(--ease-out)',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.icon}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          fontWeight: active ? 600 : 500,
          letterSpacing: 0,
          lineHeight: 1,
        }}
      >
        {item.label}
      </span>
    </Link>
  )
}
