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
            fontFamily: "var(--font-serif)",
            fontSize: "var(--text-lg)",
            color: "var(--fg)",
            textAlign: "center",
            margin: "0 0 var(--space-2)",
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
              color: "var(--fg-subtle)",
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
            style={{
              width: "100%",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              border: "none",
              backgroundColor:
                confirmVariant === "danger"
                  ? "var(--danger)"
                  : "var(--accent-rose)",
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
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
            style={{
              width: "100%",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              border: "1.5px solid var(--border)",
              backgroundColor: "transparent",
              color: "var(--fg-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
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
