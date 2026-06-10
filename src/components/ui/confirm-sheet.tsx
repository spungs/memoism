"use client";

import { BottomSheet } from "./bottom-sheet";

interface ConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  isLoading?: boolean;
}

export function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "확인",
  confirmVariant = "primary",
  isLoading = false,
}: ConfirmSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} closeOnOverlay={!isLoading}>
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
          {title}
        </p>

        {description && (
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
            {description}
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            marginTop: description ? 0 : "var(--space-5)",
          }}
        >
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="pressable"
            style={{
              width: "100%",
              minHeight: 50,
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor:
                confirmVariant === "danger" ? "var(--danger)" : "var(--tint)",
              color: "var(--on-tint)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-md)",
              fontWeight: 600,
              cursor: isLoading ? "default" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              transition: "opacity var(--duration-fast) var(--ease-out)",
            }}
          >
            {isLoading ? "처리 중..." : confirmLabel}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="pressable"
            style={{
              width: "100%",
              minHeight: 50,
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: "var(--fill-2)",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-md)",
              fontWeight: 600,
              cursor: isLoading ? "default" : "pointer",
            }}
          >
            취소
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
