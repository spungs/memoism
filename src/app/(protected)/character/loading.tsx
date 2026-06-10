export default function CharacterLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100svh - 56px - env(safe-area-inset-bottom))",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* 헤더 스켈레톤 — 타이틀 + 부제 중앙 */}
      <div
        style={{
          borderBottom: "1px solid var(--separator)",
          padding: "12px var(--space-5)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          backgroundColor: "var(--surface)",
        }}
      >
        <div className="skeleton" style={{ width: 48, height: 17, borderRadius: "var(--radius-sm)" }} />
        <div className="skeleton" style={{ width: 110, height: 12, borderRadius: "var(--radius-sm)" }} />
      </div>

      {/* 메시지 영역 스켈레톤 */}
      <div
        style={{
          flex: 1,
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {[
          { w: 180, align: "flex-start" },
          { w: 130, align: "flex-end" },
          { w: 220, align: "flex-start" },
          { w: 100, align: "flex-end" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: item.align }}>
            <div
              className="skeleton"
              style={{ width: item.w, height: 42, borderRadius: 18 }}
            />
          </div>
        ))}
      </div>

      {/* 입력창 스켈레톤 */}
      <div
        style={{
          borderTop: "1px solid var(--separator)",
          padding: "var(--space-2) var(--space-4)",
          paddingBottom: "calc(var(--space-2) + env(safe-area-inset-bottom, 0px))",
          backgroundColor: "var(--surface)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
          <div
            className="skeleton"
            style={{ flex: 1, height: 38, borderRadius: "var(--radius-pill)" }}
          />
          <div
            className="skeleton"
            style={{ width: 34, height: 34, borderRadius: "var(--radius-pill)" }}
          />
        </div>
      </div>
    </div>
  );
}
