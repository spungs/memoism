export default function DiaryLoading() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', padding: '0 var(--space-4) var(--space-12)' }}>
      {/* 헤더 (PageHeader 스켈레톤) */}
      <header style={{ paddingTop: 'calc(var(--space-5) + env(safe-area-inset-top))', marginBottom: 'var(--space-4)' }}>
        <div className="skeleton" style={{ width: 72, height: 36, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 48, height: 14 }} />
      </header>

      {/* 일기 카드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {[200, 160, 220, 140, 190, 170].map((w, i) => (
          <div key={i} style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 8 }}>
              <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
              <div className="skeleton" style={{ width: 48, height: 12 }} />
            </div>
            <div className="skeleton" style={{ width: w, height: 18, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: '80%', height: 14 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
