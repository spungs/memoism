import type { CSSProperties } from "react";

// 화면별 로딩 스켈레톤. 지금 화면 모양을 그대로 따라 그린다 — 예전 스켈레톤은 해체된 옛 홈과
// 목록 모양이라, 상세·작성·수정 화면에서도 목록이 잠깐 떴다가 다른 화면으로 바뀌었다(점검 L18).

function Bar({ w, h, r = "var(--radius-sm)", style }: { w: number | string; h: number; r?: string; style?: CSSProperties }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
}

const PAGE: CSSProperties = { minHeight: "calc(100svh - 64px)", backgroundColor: "var(--bg)" };
const TOP = "calc(var(--space-4) + env(safe-area-inset-top))";

/** 헤더 한 줄: 왼쪽·가운데·오른쪽 자리. 작성·상세·검토 화면의 52px 헤더. */
function BarHeader({ left, center, right }: { left: number; center?: number; right: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 52,
        padding: "0 var(--space-4)",
        paddingTop: "env(safe-area-inset-top)",
        borderBottom: "1px solid var(--separator)",
      }}
    >
      <Bar w={left} h={18} />
      {center ? <Bar w={center} h={18} /> : <span />}
      <Bar w={right} h={18} />
    </div>
  );
}

/** 메이 채팅 — 가운데 이름, 말풍선, 아래 입력칸. */
export function ChatSkeleton() {
  const bubbles: { mine: boolean; w: string; h: number }[] = [
    { mine: false, w: "72%", h: 64 },
    { mine: true, w: "48%", h: 40 },
    { mine: false, w: "60%", h: 44 },
    { mine: true, w: "36%", h: 40 },
    { mine: false, w: "68%", h: 88 },
  ];
  return (
    <div style={{ ...PAGE, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: `${TOP} var(--space-5) var(--space-3)` }}>
        <Bar w={48} h={20} />
        <Bar w={140} h={12} />
      </header>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4) var(--space-4)" }}>
        {bubbles.map((b, i) => (
          <div key={i} style={{ display: "flex", justifyContent: b.mine ? "flex-end" : "flex-start" }}>
            <Bar w={b.w} h={b.h} r="var(--radius-lg)" />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-4) var(--space-3)" }}>
        <Bar w={34} h={34} r="50%" />
        <Bar w="100%" h={38} r="var(--radius-pill)" style={{ flexShrink: 1 }} />
        <Bar w={34} h={34} r="50%" />
      </div>
    </div>
  );
}

/** 기록 — 제목·칩, 요약 두 칸, 검색, 월 이동, 캘린더. */
export function DiaryCalendarSkeleton() {
  return (
    <div style={{ ...PAGE, padding: `${TOP} var(--space-4) var(--space-12)` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <Bar w={72} h={36} />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Bar w={84} h={36} r="var(--radius-pill)" />
          <Bar w={28} h={28} r="50%" />
        </div>
      </div>
      <div style={{ display: "flex", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", marginBottom: "var(--space-4)" }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "var(--space-4) 0", borderLeft: i === 1 ? "1px solid var(--separator)" : undefined }}>
            <Bar w={44} h={28} />
            <Bar w={48} h={12} />
          </div>
        ))}
      </div>
      <Bar w="100%" h={40} r="var(--radius-pill)" style={{ marginBottom: "var(--space-4)" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44, marginBottom: "var(--space-2)" }}>
        <Bar w={16} h={16} />
        <Bar w={110} h={22} />
        <Bar w={16} h={16} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 8 }}>
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} style={{ height: 52, display: "flex", justifyContent: "center", paddingTop: 6 }}>
            <Bar w={20} h={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 일기 상세 — 뒤로·수정 헤더, 날짜·감정, 제목, 본문, 사진. */
export function DiaryDetailSkeleton() {
  return (
    <div style={PAGE}>
      <BarHeader left={52} right={72} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-6) var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <Bar w={140} h={14} />
          <Bar w={60} h={22} r="var(--radius-pill)" />
        </div>
        <Bar w="70%" h={26} style={{ marginBottom: "var(--space-5)" }} />
        {["100%", "96%", "100%", "88%", "60%"].map((w, i) => (
          <Bar key={i} w={w} h={16} style={{ marginBottom: 10 }} />
        ))}
        <Bar w="100%" h={220} r="var(--radius-lg)" style={{ marginTop: "var(--space-5)" }} />
      </div>
    </div>
  );
}

/** 작성·수정 — 헤더, 날짜, 감정 6칸, 제목·본문 카드, 사진, 정리 버튼. */
export function DiaryFormSkeleton() {
  return (
    <div style={PAGE}>
      <BarHeader left={40} center={64} right={32} />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", padding: "var(--space-5) var(--space-5) var(--space-8)" }}>
        <Bar w={170} h={16} />
        <div>
          <Bar w={64} h={12} style={{ marginBottom: "var(--space-2)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <Bar key={i} w="100%" h={56} r="var(--radius-md)" />
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
          <Bar w="45%" h={26} style={{ marginBottom: "var(--space-4)" }} />
          <div style={{ height: 1, backgroundColor: "var(--separator)", marginBottom: "var(--space-4)" }} />
          {["100%", "92%", "70%"].map((w, i) => (
            <Bar key={i} w={w} h={16} style={{ marginBottom: 10 }} />
          ))}
          <div style={{ height: 150 }} />
        </div>
        <Bar w={100} h={36} r="var(--radius-pill)" />
        <Bar w="100%" h={50} r="var(--radius-md)" />
      </div>
    </div>
  );
}

/** 검토 — 헤더, 사진 정보 카드, 정리된 일기 카드. */
export function DiaryReviewSkeleton() {
  return (
    <div style={PAGE}>
      <BarHeader left={40} center={64} right={32} />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-5)" }}>
        <div style={{ backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 10 }}>
          <Bar w={120} h={12} />
          <Bar w={160} h={16} />
          <Bar w={190} h={16} />
        </div>
        <div style={{ backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)" }}>
          <Bar w={150} h={12} style={{ marginBottom: "var(--space-3)" }} />
          <Bar w="55%" h={26} style={{ marginBottom: "var(--space-4)" }} />
          {["100%", "95%", "100%", "80%"].map((w, i) => (
            <Bar key={i} w={w} h={16} style={{ marginBottom: 10 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 밀린 날 채우기 — 제목, 설명, 사진 고르기 버튼. */
export function BackfillSkeleton() {
  return (
    <div style={{ ...PAGE, padding: `${TOP} var(--space-5)` }}>
      <Bar w={24} h={24} style={{ marginBottom: "var(--space-4)" }} />
      <Bar w={180} h={28} style={{ marginBottom: "var(--space-3)" }} />
      <Bar w="85%" h={14} style={{ marginBottom: 8 }} />
      <Bar w="60%" h={14} style={{ marginBottom: "var(--space-5)" }} />
      <Bar w="100%" h={50} r="var(--radius-md)" />
    </div>
  );
}

/** 설정 — 제목과 묶음 목록. */
export function SettingsSkeleton() {
  return (
    <div style={{ ...PAGE, padding: `${TOP} var(--space-4) var(--space-12)` }}>
      <Bar w={72} h={36} style={{ marginBottom: "var(--space-5)" }} />
      {[3, 2, 3].map((rows, g) => (
        <div key={g} style={{ marginBottom: "var(--space-5)" }}>
          <Bar w={64} h={12} style={{ margin: "0 0 var(--space-2) var(--space-2)" }} />
          <div style={{ backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)" }}>
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, padding: "0 var(--space-4)", borderTop: i > 0 ? "1px solid var(--separator)" : undefined }}>
                <Bar w={120} h={16} />
                <Bar w={16} h={16} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
