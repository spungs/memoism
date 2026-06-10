"use client";

import { useEffect, useState } from "react";

// 22:00 리마인드 Web Push 구독 토글 (NEW-15).
// dev에선 PWA service worker가 비활성(next.config.ts `disable: true`)이라
// 푸시 구독은 prod 빌드에서만 정상 동작한다.

// VAPID 공개키(base64url) → Uint8Array. PushManager.subscribe의 applicationServerKey 형식.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// iOS Safari는 홈 화면에 추가된(standalone) PWA에서만 Web Push를 지원한다.
function isIosNonStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS 전용 navigator.standalone
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;
  return isIos && !standalone;
}

type Support = "checking" | "supported" | "unsupported" | "ios-needs-install";

export function PushToggle() {
  const [support, setSupport] = useState<Support>("checking");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 마운트 시 지원 여부 + 기존 구독 상태 확인.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (isIosNonStandalone()) {
        if (!cancelled) setSupport("ios-needs-install");
        return;
      }
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setSupport("unsupported");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (!cancelled) {
          setEnabled(Boolean(sub) && Notification.permission === "granted");
          setSupport("supported");
        }
      } catch {
        if (!cancelled) setSupport("unsupported");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(
          "알림 권한이 거부됐어요. 브라우저 설정에서 알림을 허용해주세요.",
        );
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError("알림 설정이 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "알림 설정에 실패했어요");
      }

      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알림 설정에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setEnabled(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알림 해제에 실패했어요");
    } finally {
      setBusy(false);
    }
  }

  function handleToggle() {
    if (busy) return;
    if (enabled) {
      void handleDisable();
    } else {
      void handleEnable();
    }
  }

  const hint =
    support === "ios-needs-install"
      ? "iOS는 홈 화면에 추가한 뒤 알림을 받을 수 있어요."
      : support === "unsupported"
        ? "이 브라우저에서는 알림을 지원하지 않아요."
        : null;

  const interactive = support === "supported";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 var(--space-4)",
          minHeight: 48,
          gap: "var(--space-3)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              fontWeight: 400,
              color: "var(--fg)",
              margin: 0,
            }}
          >
            22:00 리마인드 알림
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--fg-muted)",
              margin: "2px 0 0",
            }}
          >
            매일 밤 메이가 하루를 남기도록 살짝 알려줘요.
          </p>
        </div>
        <IOSSwitch
          checked={enabled}
          disabled={!interactive || busy}
          onToggle={handleToggle}
        />
      </div>

      {hint && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            margin: "0 0 var(--space-3)",
            padding: "0 var(--space-4)",
          }}
        >
          {hint}
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
            margin: "0 0 var(--space-3)",
            padding: "0 var(--space-4)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// iOS 스위치: 트랙 51×31 캡슐, on=#34C759, off=fill-1, 노브 27px 흰 원 + shadow-sm
function IOSSwitch({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="22:00 리마인드 알림"
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
