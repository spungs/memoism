export type TimelineFragment = {
  id: string;
  kind: string;
  content: string | null;
  createdAt: Date;
};

/** KST 시각 라벨 (12:31). */
function timeLabel(d: Date): string {
  return d.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 조각 타임라인 (스펙 §6 ②층). AI 정리를 안 해도 이것만으로 그날이 설명된다.
 * 정리된 산문이 있어도 조각은 보존·표시한다(되돌리기·재정리의 원본 근거).
 */
export function FragmentTimeline({
  fragments,
}: {
  fragments: TimelineFragment[];
}) {
  if (fragments.length === 0) return null;

  return (
    <section style={{ marginTop: 24 }}>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-subtle)",
          letterSpacing: "var(--tracking-wider)",
          fontWeight: 600,
          margin: "0 0 8px",
        }}
      >
        📎 모은 조각 ({fragments.length})
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {fragments.map((f) => (
          <li
            key={f.id}
            style={{
              display: "flex",
              gap: 10,
              padding: "8px 0",
              borderTop: "1px solid var(--separator)",
            }}
          >
            <span
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-placeholder)",
                paddingTop: 2,
              }}
            >
              {timeLabel(f.createdAt)}
            </span>
            <span
              className="selectable"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg)",
                whiteSpace: "pre-wrap",
              }}
            >
              {f.kind === "photo" ? "📷 사진" : f.content}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
