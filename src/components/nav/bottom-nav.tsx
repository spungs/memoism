'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  exact?: boolean
}

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const DiaryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    <line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
  </svg>
)

const ComposeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const CharacterIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M6 20v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
)

const navItems: NavItem[] = [
  { href: '/', label: '홈', icon: <HomeIcon />, exact: true },
  { href: '/diary', label: '일기', icon: <DiaryIcon /> },
]

const rightNavItems: NavItem[] = [
  { href: '/character', label: '메이', icon: <CharacterIcon /> },
  { href: '/settings', label: '설정', icon: <SettingsIcon /> },
]

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 'var(--container-mobile)',
        backgroundColor: 'var(--surface-raised)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
        boxShadow: '0 -2px 12px rgba(74,61,46,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 56,
          padding: '0 8px',
        }}
      >
        {navItems.map((item) => (
          <NavTab key={item.href} item={item} active={isActive(item)} />
        ))}

        <Link
          href="/diary/new"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--accent-rose)',
            color: '#fff',
            flex: '0 0 auto',
            margin: '0 8px',
            boxShadow: 'var(--shadow-md)',
            transition: 'background-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
          }}
          onMouseDown={(e) => {
            ;(e.currentTarget as HTMLElement).style.transform = 'scale(0.93)'
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-rose-deep)'
          }}
          onMouseUp={(e) => {
            ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent-rose)'
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
        gap: 3,
        height: '100%',
        color: active ? 'var(--accent-rose)' : 'var(--ink-4)',
        textDecoration: 'none',
        transition: 'color var(--duration-fast) var(--ease-out)',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: active ? 1 : 0.7 }}>
        {item.icon}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: active ? 600 : 400,
          letterSpacing: 'var(--tracking-wider)',
          lineHeight: 1,
        }}
      >
        {item.label}
      </span>
      {active && (
        <span
          style={{
            position: 'absolute',
            bottom: 4,
            width: 4,
            height: 4,
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--accent-rose)',
          }}
        />
      )}
    </Link>
  )
}
