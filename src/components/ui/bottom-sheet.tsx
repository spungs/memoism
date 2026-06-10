"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeOnOverlay?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  closeOnOverlay = true,
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  // body 포털 — 글래스 헤더(backdrop-filter) 등 조상이 fixed의 containing block을
  // 만들어 시트가 엉뚱한 위치에 박히는 것을 구조적으로 차단한다.
  return createPortal(
    <>
      <div
        onClick={closeOnOverlay ? onClose : undefined}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "var(--overlay-dim)",
          zIndex: 100,
          animation: "memo-fade-in 250ms var(--ease-out)",
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "var(--container-mobile)",
          backgroundColor: "var(--surface)",
          borderRadius: "20px 20px 0 0",
          paddingBottom: "calc(var(--space-5) + env(safe-area-inset-bottom))",
          zIndex: 101,
          animation: "memo-slide-up 380ms var(--ease-out)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 36,
            height: 5,
            backgroundColor: "var(--fill-1)",
            borderRadius: "var(--radius-pill)",
            margin: "var(--space-2) auto var(--space-2)",
          }}
        />
        {children}
      </div>

      <style>{`
        @keyframes memo-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes memo-slide-up {
          from { transform: translateX(-50%) translateY(100%); }
          to   { transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>,
    document.body,
  );
}
