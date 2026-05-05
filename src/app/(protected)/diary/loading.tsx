export default function DiaryLoading() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', padding: 'var(--space-5) var(--space-4) var(--space-12)' }}>
      {/* 헤더 */}
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-6)', padding: '0 var(--space-1)' }}>
        <div>
          <div className="skeleton" style={{ width: 60, height: 32, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 48, height: 14 }} />
        </div>
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius-pill)' }} />
      </header>

      {/* 일기 카드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {[200, 160, 220, 140, 190, 170].map((w, i) => (
          <div key={i} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div className="skeleton" style={{ width: w, height: 18, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '90%', height: 14, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: '70%', height: 14, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: 60, height: 12 }} />
          </div>
        ))}
      </div>
    </main>
  )
}
