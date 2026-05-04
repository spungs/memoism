"use client";

import { useEffect } from "react";

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

  return (
    <>
      <div
        onClick={closeOnOverlay ? onClose : undefined}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(42, 33, 24, 0.4)",
          zIndex: 100,
          animation: "memo-fade-in 200ms var(--ease-out)",
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
          backgroundColor: "var(--surface-raised)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          paddingBottom: "calc(var(--space-5) + env(safe-area-inset-bottom))",
          zIndex: 101,
          animation: "memo-slide-up 250ms var(--ease-out)",
          boxShadow: "0 -4px 32px rgba(74,61,46,0.15)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 36,
            height: 4,
            backgroundColor: "var(--border-strong)",
            borderRadius: "var(--radius-pill)",
            margin: "var(--space-3) auto var(--space-2)",
            opacity: 0.5,
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
    </>
  );
}
