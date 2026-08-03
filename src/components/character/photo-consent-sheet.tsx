"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";

const SHEET_BUTTON: React.CSSProperties = {
  width: "100%",
  minHeight: 50,
  padding: "var(--space-3) var(--space-4)",
  borderRadius: "var(--radius-md)",
  border: "none",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-md)",
  fontWeight: 600,
  cursor: "pointer",
};

/**
 * 사진을 메이에게 보여줄지 묻는 최초 1회 동의.
 *
 * **사진을 고르기 전에** 묻는다 — 보낸 뒤에 물으면 전달할지 말지를 사용자가
 * 정할 수 없다. 거부해도 사진 첨부 자체는 된다(일기엔 저장되고 메이만 못 본다).
 *
 * ConfirmSheet를 쓰지 않는 이유: 그쪽 취소 버튼은 라벨이 "취소"로 고정이라
 * "실수로 눌렀다"인지 "보여주지 않겠다"인지 구분되지 않는다. 이 결정은 한 번
 * 기록되면 다시 묻지 않으므로 **두 선택지를 명시적으로** 보여줘야 하고,
 * 오버레이로 닫는 건 **아무것도 기록하지 않는** 이탈로 취급한다.
 */
export function PhotoConsentSheet({
  isOpen,
  onAllow,
  onDeny,
  onDismiss,
  isLoading,
}: {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
  /** 결정하지 않고 닫음 — 기록하지 않고 다음에 다시 묻는다. */
  onDismiss: () => void;
  isLoading: boolean;
}) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onDismiss} closeOnOverlay={!isLoading}>
      <div style={{ padding: "var(--space-4) var(--space-5) 0" }}>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--fg)",
            textAlign: "center",
            margin: "var(--space-2) 0 var(--space-1)",
            lineHeight: "var(--leading-snug)",
          }}
        >
          사진을 메이에게 보여줄까요?
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            textAlign: "center",
            margin: "0 0 var(--space-5)",
            lineHeight: "var(--leading-normal)",
          }}
        >
          메이가 사진을 보고 대화할 수 있어요. 사진은 그때 대화를 위해서만
          전달되고, 사진 설명이 일기에 저장되지는 않아요. 보여주지 않아도 사진은
          일기에 그대로 저장돼요. 설정에서 언제든 바꿀 수 있어요.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <button
            type="button"
            className="pressable"
            onClick={onAllow}
            disabled={isLoading}
            style={{
              ...SHEET_BUTTON,
              backgroundColor: "var(--tint)",
              color: "var(--on-tint)",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "저장 중..." : "보여주기"}
          </button>
          <button
            type="button"
            className="pressable"
            onClick={onDeny}
            disabled={isLoading}
            style={{
              ...SHEET_BUTTON,
              backgroundColor: "var(--fill-2)",
              color: "var(--fg)",
            }}
          >
            보여주지 않기
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
