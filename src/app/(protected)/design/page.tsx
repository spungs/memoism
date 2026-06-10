import { notFound } from "next/navigation";

// Dev-only design system showcase. Hidden in production builds.
export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main
      style={{
        backgroundColor: "var(--bg)",
        minHeight: "100svh",
        padding: "var(--space-5)",
        paddingBottom: "var(--space-16)",
      }}
    >
      {/* ── Large Title ── */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-3xl)",
            fontWeight: 700,
            color: "var(--fg)",
            letterSpacing: "var(--tracking-tight)",
            lineHeight: "var(--leading-tight)",
            margin: "0 0 var(--space-2)",
          }}
        >
          메모이즘
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            margin: 0,
          }}
        >
          Memoism Design System — Apple Edition v2
        </p>
      </section>

      {/* ── 라벨 알파 4단 ── */}
      <SectionTitle>라벨 알파 4단</SectionTitle>
      <div
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          marginBottom: "var(--space-6)",
        }}
      >
        {[
          { label: "Primary (100%)", style: { color: "var(--fg)", fontWeight: 600 } },
          { label: "Secondary (60%)", style: { color: "var(--fg-muted)" } },
          { label: "Tertiary (34%)", style: { color: "var(--fg-subtle)" } },
          { label: "Quaternary (18%)", style: { color: "var(--fg-placeholder)" } },
        ].map(({ label, style }, i, arr) => (
          <div key={label}>
            <div
              style={{
                padding: "var(--space-4)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base)",
                ...style,
              }}
            >
              {label}
            </div>
            {i < arr.length - 1 && (
              <div style={{ height: 1, backgroundColor: "var(--separator)", marginLeft: "var(--space-4)" }} />
            )}
          </div>
        ))}
      </div>

      {/* ── 버튼 3종 ── */}
      <SectionTitle>버튼 3종</SectionTitle>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        {/* Filled */}
        <button
          type="button"
          className="pressable"
          style={{
            width: "100%",
            height: 50,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--on-tint)",
            backgroundColor: "var(--tint)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Filled — 주요 액션
        </button>
        {/* Tinted */}
        <button
          type="button"
          className="pressable"
          style={{
            width: "100%",
            height: 50,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--tint)",
            backgroundColor: "var(--tint-soft)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Tinted — 보조 액션
        </button>
        {/* Plain */}
        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--tint)",
            cursor: "pointer",
            padding: "var(--space-3) 0",
          }}
        >
          Plain — 텍스트 액션
        </button>
        {/* Danger */}
        <button
          type="button"
          className="pressable"
          style={{
            width: "100%",
            height: 50,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--danger)",
            backgroundColor: "color-mix(in srgb, var(--danger) 10%, transparent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
          }}
        >
          Destructive — 위험 액션
        </button>
      </div>

      {/* ── 리스트 그룹 샘플 ── */}
      <SectionTitle>리스트 그룹</SectionTitle>
      <div
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          marginBottom: "var(--space-6)",
        }}
      >
        {["알림 설정", "비밀번호 변경", "데이터 내보내기"].map((item, i, arr) => (
          <div key={item}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 var(--space-4)",
                minHeight: 48,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-base)",
                  color: "var(--fg)",
                }}
              >
                {item}
              </span>
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--fg-placeholder)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            {i < arr.length - 1 && (
              <div style={{ height: 1, backgroundColor: "var(--separator)", marginLeft: "var(--space-4)" }} />
            )}
          </div>
        ))}
      </div>

      {/* ── iOS 스위치 ── */}
      <SectionTitle>스위치</SectionTitle>
      <div
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          marginBottom: "var(--space-6)",
        }}
      >
        {[
          { label: "On (success)", checked: true },
          { label: "Off", checked: false },
        ].map(({ label, checked }, i, arr) => (
          <div key={label}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 var(--space-4)",
                minHeight: 48,
              }}
            >
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-base)", color: "var(--fg)" }}>
                {label}
              </span>
              {/* 스위치 — 51×31, on=#34C759 */}
              <div
                style={{
                  position: "relative",
                  width: 51,
                  height: 31,
                  borderRadius: 999,
                  backgroundColor: checked ? "var(--success)" : "var(--fill-1)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: checked ? 22 : 2,
                    width: 27,
                    height: 27,
                    borderRadius: 999,
                    backgroundColor: "#fff",
                    boxShadow: "var(--shadow-sm)",
                  }}
                />
              </div>
            </div>
            {i < arr.length - 1 && (
              <div style={{ height: 1, backgroundColor: "var(--separator)", marginLeft: "var(--space-4)" }} />
            )}
          </div>
        ))}
      </div>

      {/* ── MoodBadge 6종 ── */}
      <SectionTitle>MoodBadge 6종</SectionTitle>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          marginBottom: "var(--space-6)",
        }}
      >
        {[
          { label: "기쁨", color: "var(--mood-joy)" },
          { label: "평온", color: "var(--mood-calm)" },
          { label: "슬픔", color: "var(--mood-sad)" },
          { label: "사랑", color: "var(--mood-love)" },
          { label: "분노", color: "var(--mood-anger)" },
          { label: "피곤", color: "var(--mood-tired)" },
        ].map(({ label, color }) => (
          <span
            key={label}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color,
              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
              borderRadius: "var(--radius-pill)",
              padding: "var(--space-1) var(--space-3)",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* ── Fill 단계 ── */}
      <SectionTitle>Fill 단계</SectionTitle>
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        {[
          { label: "fill-1 (16%)", bg: "var(--fill-1)" },
          { label: "fill-2 (10%)", bg: "var(--fill-2)" },
          { label: "fill-3 (6%)", bg: "var(--fill-3)" },
        ].map(({ label, bg }) => (
          <div
            key={label}
            style={{
              flex: 1,
              height: 56,
              borderRadius: "var(--radius-md)",
              backgroundColor: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-muted)",
                textAlign: "center",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Radius 샘플 ── */}
      <SectionTitle>Radius</SectionTitle>
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          marginBottom: "var(--space-6)",
        }}
      >
        {[
          { label: "sm 8", radius: "var(--radius-sm)" },
          { label: "md 12", radius: "var(--radius-md)" },
          { label: "lg 16", radius: "var(--radius-lg)" },
          { label: "xl 22", radius: "var(--radius-xl)" },
          { label: "pill", radius: "var(--radius-pill)" },
        ].map(({ label, radius }) => (
          <div
            key={label}
            style={{
              width: 64,
              height: 64,
              borderRadius: radius,
              backgroundColor: "var(--tint-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--tint)",
                textAlign: "center",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── 틴트 스와치 ── */}
      <SectionTitle>틴트</SectionTitle>
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        {[
          { label: "tint", bg: "var(--tint)", fg: "var(--on-tint)" },
          { label: "pressed", bg: "var(--tint-pressed)", fg: "var(--on-tint)" },
          { label: "soft", bg: "var(--tint-soft)", fg: "var(--tint)" },
        ].map(({ label, bg, fg }) => (
          <div
            key={label}
            style={{
              flex: 1,
              height: 56,
              borderRadius: "var(--radius-md)",
              backgroundColor: bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: fg,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── 타이포 스케일 ── */}
      <SectionTitle>타이포 스케일</SectionTitle>
      <div
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-md)",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        {[
          { size: "var(--text-3xl)", weight: 700, label: "34 / 700 — Large Title" },
          { size: "var(--text-2xl)", weight: 700, label: "28 / 700 — Title 1" },
          { size: "var(--text-xl)", weight: 700, label: "22 / 700 — Title 2" },
          { size: "var(--text-md)", weight: 600, label: "17 / 600 — Headline" },
          { size: "var(--text-base)", weight: 400, label: "15 / 400 — Subheadline" },
          { size: "var(--text-sm)", weight: 400, label: "13 / 400 — Footnote" },
          { size: "var(--text-xs)", weight: 400, label: "12 / 400 — Caption" },
        ].map(({ size, weight, label }) => (
          <p
            key={label}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: size,
              fontWeight: weight,
              color: "var(--fg)",
              margin: 0,
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            {label}
          </p>
        ))}
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: 400,
        color: "var(--fg-muted)",
        margin: "0 0 var(--space-2)",
        paddingLeft: "var(--space-4)",
      }}
    >
      {children}
    </p>
  );
}
