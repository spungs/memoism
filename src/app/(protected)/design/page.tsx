export default function DesignPreviewPage() {
  return (
    <main style={{ padding: "var(--space-6)" }}>
      <h1
        className="memo-display"
        style={{
          color: "var(--accent-rose-deep)",
          marginBottom: "var(--space-4)",
        }}
      >
        메모이즘
      </h1>
      <p className="memo-body" style={{ marginBottom: "var(--space-8)" }}>
        스쳐지나가는 일상들을 기록하기 위한 나만의 일기장
      </p>

      {/* 색상 팔레트 미리보기 */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
        }}
      >
        {[
          "--accent-rose",
          "--accent-sage",
          "--accent-lilac",
          "--accent-amber",
        ].map((c) => (
          <div
            key={c}
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              backgroundColor: `var(${c})`,
              boxShadow: "var(--shadow-sm)",
            }}
          />
        ))}
      </div>

      <a
        href="/diary"
        className="memo-ui"
        style={{ color: "var(--brand)" }}
      >
        일기 목록 →
      </a>
    </main>
  );
}
