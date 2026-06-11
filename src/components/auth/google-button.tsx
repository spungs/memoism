import type { GoogleFlow } from "@/lib/auth/google";

// 전체 네비게이션이 필요한 OAuth 시작이라 next/link/router가 아니라 <a>를 쓴다.
export function GoogleButton({ flow, label }: { flow: GoogleFlow; label: string }) {
  return (
    <a
      href={`/api/auth/google?flow=${flow}`}
      className="pressable"
      style={{
        width: "100%",
        height: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-base)",
        fontWeight: 600,
        color: "var(--fg)",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--separator)",
        borderRadius: "var(--radius-md)",
        textDecoration: "none",
      }}
    >
      <GoogleLogo />
      <span>{label}</span>
    </a>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
