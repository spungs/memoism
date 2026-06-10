"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * 도는 링 스피너. 전역 `@keyframes spin`(globals.css) 재사용.
 * 버튼 안 작은 스피너 / 오버레이 큰 스피너 양쪽에서 쓴다.
 */
export function Spinner({
  size = 16,
  color = "currentColor",
  thickness = 2,
}: {
  size?: number;
  color?: string;
  thickness?: number;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `${thickness}px solid color-mix(in srgb, ${color} 25%, transparent)`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

interface Props {
  /** 중앙 문구. \n으로 줄바꿈 가능 (whiteSpace: pre-line). */
  label: string;
  /** 있으면 "취소" 버튼 노출 — 요청이 멈춰도 갇히지 않게 하는 안전장치. */
  onCancel?: () => void;
}

/**
 * AI 처리 중 전체 화면을 덮는 차단 오버레이.
 * - 본문·사진·하단 네비까지 덮어 헛편집·오작동을 막는다.
 * - 스크림 컨벤션은 bottom-sheet.tsx와 동일 (rgba(42,33,24,0.4), zIndex 100).
 * - 백드롭 클릭으로는 닫히지 않는다 (오직 취소 버튼).
 */
export function AiBusyOverlay({ label, onCancel }: Props) {
  // 마운트 동안 배경 스크롤 잠금 (bottom-sheet와 동일 패턴).
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (typeof document === "undefined") return null;

  // body 포털 — 조상에 backdrop-filter/transform이 있어도 전체 화면을 확실히 덮는다.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        backgroundColor: "var(--overlay-dim)",
        animation: "memo-overlay-fade-in 250ms var(--ease-out)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-4)",
          width: "100%",
          maxWidth: 300,
          padding: "var(--space-8) var(--space-6)",
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          textAlign: "center",
        }}
      >
        <Spinner size={32} color="var(--tint)" thickness={3} />
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            lineHeight: "var(--leading-normal)",
            color: "var(--fg)",
            whiteSpace: "pre-line",
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
          }}
        >
          잠시만 기다려 주세요
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="pressable"
            style={{
              marginTop: "var(--space-1)",
              minHeight: 44,
              padding: "10px 24px",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: "var(--fill-2)",
              color: "var(--fg)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            취소
          </button>
        )}
      </div>

      <style>{`
        @keyframes memo-overlay-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
