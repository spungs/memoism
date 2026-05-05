export default function ShopLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100svh - 56px)', backgroundColor: 'var(--bg)' }}>
      {/* 헤더 */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="skeleton" style={{ width: 60, height: 16 }} />
        <div className="skeleton" style={{ width: 40, height: 24 }} />
        <div className="skeleton" style={{ width: 48, height: 16 }} />
      </header>

      {/* 스킨 그리드 */}
      <section style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div className="skeleton" style={{ width: 70, height: 14 }} />
          <div className="skeleton" style={{ width: 50, height: 14 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 'var(--space-3)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div className="skeleton" style={{ width: '100%', height: 140, borderRadius: 0 }} />
              <div style={{ padding: 'var(--space-3)' }}>
                <div className="skeleton" style={{ width: '70%', height: 16, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '50%', height: 14 }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
