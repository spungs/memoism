interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * 문서 스크롤 탭(일기·설정)의 공통 페이지 헤더.
 * iOS Large Title 관습(34px/700/tight)과 노치 보정(safe-area-inset-top)을 통일한다.
 * 메이(채팅)는 고정 셸 헤더라, 홈은 브랜드 워드마크라 이걸 쓰지 않는다.
 * 가로 패딩은 부모 컨테이너에서 상속받아 본문과 정렬을 맞춘다.
 */
export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header
      style={{
        paddingTop: "calc(var(--space-6) + env(safe-area-inset-top))",
        marginBottom: "var(--space-5)",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-3xl)",
          color: "var(--fg)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-tight)",
          lineHeight: "var(--leading-tight)",
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            margin: "var(--space-1) 0 0 0",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-muted)",
            letterSpacing: 0,
          }}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
