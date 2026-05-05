export default function CharacterLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100svh - 56px)', backgroundColor: 'var(--bg)' }}>
      {/* 캐릭터 헤더 */}
      <div style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: 'var(--space-4) var(--space-5)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 8 }}>
              <div className="skeleton" style={{ width: 80, height: 20, borderRadius: 'var(--radius-pill)' }} />
              <div className="skeleton" style={{ width: 60, height: 20 }} />
            </div>
            <div className="skeleton" style={{ width: '100%', height: 5, borderRadius: 'var(--radius-pill)', marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {[40, 40, 50].map((w, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div className="skeleton" style={{ width: 28, height: 12 }} />
                  <div className="skeleton" style={{ width: w, height: 16 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, padding: 'var(--space-4) var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {[{ w: 160, align: 'flex-start' }, { w: 120, align: 'flex-end' }, { w: 200, align: 'flex-start' }, { w: 90, align: 'flex-end' }].map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: item.align }}>
            <div className="skeleton" style={{ width: item.w, height: 40, borderRadius: 'var(--radius-lg)' }} />
          </div>
        ))}
      </div>

      {/* 입력창 */}
      <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-3) var(--space-4)', backgroundColor: 'var(--surface-raised)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
          <div className="skeleton" style={{ flex: 1, height: 44, borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-pill)' }} />
        </div>
      </div>
    </div>
  )
}
