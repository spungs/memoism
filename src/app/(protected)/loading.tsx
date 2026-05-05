export default function HomeLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100svh - 56px)', backgroundColor: 'var(--bg)' }}>
      {/* 헤더 */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-5)', paddingTop: 'calc(var(--space-4) + env(safe-area-inset-top))' }}>
        <div className="skeleton" style={{ width: 80, height: 28 }} />
        <div className="skeleton" style={{ width: 60, height: 16 }} />
      </header>

      {/* 캐릭터 카드 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)' }}>
        <div className="skeleton" style={{ width: 120, height: 120, borderRadius: '50%' }} />
        <div className="skeleton" style={{ width: 100, height: 20 }} />
        <div className="skeleton" style={{ width: 160, height: 8, borderRadius: 'var(--radius-pill)' }} />
        <div style={{ display: 'flex', gap: 'var(--space-5)' }}>
          {[60, 50, 55].map((w, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div className="skeleton" style={{ width: 32, height: 12 }} />
              <div className="skeleton" style={{ width: w, height: 16 }} />
            </div>
          ))}
        </div>
      </div>

      {/* 최근 일기 */}
      <section style={{ padding: '0 var(--space-5) var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div className="skeleton" style={{ width: 60, height: 14 }} />
          <div className="skeleton" style={{ width: 50, height: 14 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {[140, 180, 120].map((w, i) => (
            <div key={i} style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div className="skeleton" style={{ width: w, height: 16, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: 50, height: 12 }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
