/**
 * "이번 달 / 모은 기록" 안심 지표 (MIG-12).
 * old 홈이 해체되면서 기록 탭 상단으로 이사했다(스펙 §7).
 * 일기가 적어도 "쌓이고 있다"는 단서를 주는 게 목적이라 0이어도 숨기지 않는다.
 */
export function DiarySummaryStats({
  thisMonth,
  total,
}: {
  thisMonth: number;
  total: number;
}) {
  return (
    <section aria-label="기록 요약" style={{ marginBottom: "var(--space-5)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        <SummaryStat label="이번 달" value={thisMonth} />
        <div aria-hidden style={{ width: 1, backgroundColor: "var(--separator)" }} />
        <SummaryStat label="모은 기록" value={total} />
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "var(--space-4) var(--space-3)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-2xl)",
          fontWeight: 700,
          color: "var(--fg)",
          lineHeight: 1.1,
          letterSpacing: "var(--tracking-tight)",
        }}
      >
        {value}
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            fontWeight: 400,
            marginLeft: 2,
          }}
        >
          편
        </span>
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-muted)",
          fontWeight: 500,
          letterSpacing: 0,
        }}
      >
        {label}
      </span>
    </div>
  );
}
