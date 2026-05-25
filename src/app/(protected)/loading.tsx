export default function HomeLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100svh - 56px)', backgroundColor: 'var(--bg)' }}>
      {/* 헤더 */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-5)', paddingTop: 'calc(var(--space-4) + env(safe-area-inset-top))' }}>
        <div className="skeleton" style={{ width: 80, height: 28 }} />
        <div className="skeleton" style={{ width: 60, height: 16 }} />
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', padding: 'var(--space-2) var(--space-5) var(--space-8)' }}>
        {/* 오늘의 일기 위젯 */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 64, height: 12, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: '70%', height: 18, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '90%', height: 14 }} />
          </div>
          <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
        </div>

        {/* 이번 달 요약 strip */}
        <div style={{ display: 'flex', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 'var(--space-4) var(--space-3)', borderLeft: i === 1 ? '1px solid var(--border)' : undefined }}>
              <div className="skeleton" style={{ width: 36, height: 28 }} />
              <div className="skeleton" style={{ width: 48, height: 12 }} />
            </div>
          ))}
        </div>

        {/* 최근 일기 */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <div className="skeleton" style={{ width: 60, height: 14 }} />
            <div className="skeleton" style={{ width: 50, height: 14 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ padding: 'var(--space-4) var(--space-5)', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ width: 120, height: 12, marginBottom: 10 }} />
                <div className="skeleton" style={{ width: '95%', height: 14, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '60%', height: 14 }} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
