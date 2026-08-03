"use client";

/**
 * iOS 스위치 — 트랙 51×31 캡슐, on=success, off=fill-1, 노브 27px 흰 원 + shadow-sm.
 *
 * 설정의 토글이 두 곳(알림·사진 보여주기)으로 늘면서 같은 마크업이 복제됐다.
 * 시각 규격이 바뀔 때 한쪽만 고쳐져 어긋나지 않도록 단일 출처로 둔다.
 */
export function IOSSwitch({
  checked,
  label,
  disabled = false,
  onToggle,
}: {
  checked: boolean;
  /** 스크린리더용 이름 — 행 라벨이 시각적으로만 있으므로 필수다. */
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      style={{
        position: "relative",
        width: 51,
        height: 31,
        flexShrink: 0,
        borderRadius: "var(--radius-pill)",
        border: "none",
        backgroundColor: checked ? "var(--success)" : "var(--fill-1)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background-color 200ms var(--ease-out)",
        padding: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 27,
          height: 27,
          borderRadius: "var(--radius-pill)",
          backgroundColor: "#ffffff",
          boxShadow: "var(--shadow-sm)",
          transition: "left 200ms var(--ease-out)",
        }}
      />
    </button>
  );
}
