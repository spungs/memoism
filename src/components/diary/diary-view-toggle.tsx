import Link from "next/link";

type View = "list" | "calendar";

// /diary 헤더와 검색창 사이의 [목록 | 달력] pill 세그먼트.
// 탭 상태는 URL(?view=)로 관리 → 서버에서 active 결정, Link로 전환.
export function DiaryViewToggle({ active }: { active: View }) {
  return (
    <div
      role="tablist"
      aria-label="일기 보기 방식"
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-pill)",
      }}
    >
      <ToggleTab href="/diary?view=list" label="목록" active={active === "list"} />
      <ToggleTab href="/diary?view=calendar" label="달력" active={active === "calendar"} />
    </div>
  );
}

function ToggleTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      style={{
        padding: "6px 16px",
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: active ? 600 : 500,
        letterSpacing: "var(--tracking-wide)",
        textDecoration: "none",
        color: active ? "var(--fg)" : "var(--fg-subtle)",
        backgroundColor: active ? "var(--surface-raised)" : "transparent",
        boxShadow: active ? "var(--shadow-xs)" : "none",
      }}
    >
      {label}
    </Link>
  );
}
