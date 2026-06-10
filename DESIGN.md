---
version: 2.0-apple
name: Memoism Design System
description: 스쳐 지나가는 일상을 기록하는 AI 일기 도우미. Apple HIG의 조용한 미니멀리즘 위에 종이의 온기를 한 방울 — 콘텐츠(일기)가 주인공, UI는 물러난다.

colors:
  bg:
    base: "#F4F3F1"
    card: "#FFFFFF"
    cardElevated: "#FFFFFF"
  fill:
    "1": "rgba(120,116,108,0.16)"
    "2": "rgba(120,116,108,0.10)"
    "3": "rgba(120,116,108,0.06)"
  label:
    primary: "#1C1B1A"
    secondary: "rgba(60,56,50,0.60)"
    tertiary: "rgba(60,56,50,0.34)"
    quaternary: "rgba(60,56,50,0.18)"
  separator: "rgba(60,56,50,0.14)"
  tint:
    base: "#C44A38"
    pressed: "#A23B2C"
    soft: "rgba(196,74,56,0.11)"
    on: "#FFFFFF"
  mood:
    joy: "#E9A13B"
    calm: "#4FB6A4"
    sad: "#6B8FC9"
    love: "#E2768C"
    anger: "#C04A57"
    tired: "#9C948A"
  status:
    success: "#34C759"
    warning: "#FF9500"
    danger: "#FF3B30"
    info: "#007AFF"
  semantic:
    bg: "{colors.bg.base}"
    surface: "{colors.bg.card}"
    surfaceRaised: "{colors.bg.card}"
    border: "{colors.separator}"
    fg: "{colors.label.primary}"
    fgMuted: "rgba(60,56,50,0.62)"
    fgSubtle: "rgba(60,56,50,0.46)"
    fgPlaceholder: "{colors.label.tertiary}"
    brand: "{colors.tint.base}"
    brandDeep: "{colors.tint.pressed}"

typography:
  fonts:
    sans: "-apple-system, BlinkMacSystemFont, 'Pretendard', 'Apple SD Gothic Neo', 'Segoe UI', Roboto, sans-serif"
    mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', monospace"
  scale:
    xs: 12px
    sm: 13px
    base: 15px
    md: 17px
    lg: 20px
    xl: 22px
    "2xl": 28px
    "3xl": 34px
    display: 40px
  lineHeight:
    tight: 1.18
    snug: 1.3
    normal: 1.45
    relaxed: 1.7
  tracking:
    tight: -0.02em
    normal: -0.004em
    wide: 0.01em
    wider: 0.05em
  presets:
    largeTitle:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.3xl}"
      fontWeight: 700
      lineHeight: "{typography.lineHeight.tight}"
      letterSpacing: "{typography.tracking.tight}"
    title1:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.2xl}"
      fontWeight: 700
      lineHeight: "{typography.lineHeight.tight}"
      letterSpacing: "{typography.tracking.tight}"
    title2:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.xl}"
      fontWeight: 700
      lineHeight: "{typography.lineHeight.snug}"
      letterSpacing: "{typography.tracking.tight}"
    headline:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.md}"
      fontWeight: 600
      lineHeight: "{typography.lineHeight.snug}"
    body:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.md}"
      fontWeight: 400
      lineHeight: "{typography.lineHeight.relaxed}"
      color: "{colors.label.primary}"
    subheadline:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.base}"
      lineHeight: "{typography.lineHeight.normal}"
    footnote:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.sm}"
      lineHeight: "{typography.lineHeight.normal}"
      color: "{colors.label.secondary}"
    caption:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.xs}"
      lineHeight: "{typography.lineHeight.normal}"
      color: "{colors.label.tertiary}"

spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "5": 20px
  "6": 24px
  "8": 32px
  "10": 40px
  "12": 48px
  "16": 64px
  "20": 80px

rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 22px
  pill: 999px

elevation:
  xs: "0 1px 2px rgba(0,0,0,0.04)"
  sm: "0 2px 8px rgba(0,0,0,0.06)"
  md: "0 8px 24px rgba(0,0,0,0.10)"
  lg: "0 16px 48px rgba(0,0,0,0.16)"

material:
  bar: "background: rgba(244,243,241,0.82); backdrop-filter: blur(20px) saturate(180%)"
  barStrong: "rgba(244,243,241,0.93) — 스크롤 중 .glass.is-scrolled (콘텐츠에 반응하는 재질)"
  overlayDim: "rgba(0,0,0,0.4)"

motion:
  ease:
    out: "cubic-bezier(0.32,0.72,0,1)"
    inOut: "cubic-bezier(0.45,0,0.25,1)"
    bounce: "cubic-bezier(0.34,1.56,0.64,1)"
  duration:
    fast: 150ms
    base: 250ms
    slow: 420ms

layout:
  container:
    mobile: 390px
    tablet: 768px
    page: 1100px
  touchTarget: 44px
  pageGutter: "{spacing.5}"

components:
  tabBar:
    height: 52px
    material: "{material.bar}"
    borderTop: "1px solid {colors.separator}"
    label: "11px / weight 500 / tracking 0"
    active: "{colors.tint.base}"
    inactive: "{colors.label.tertiary}"
    composeButton:
      size: 46px
      rounded: "{rounded.pill}"
      backgroundColor: "{colors.tint.base}"
      pressed: "scale(0.92) + {colors.tint.pressed}"
  largeTitleHeader:
    title: "{typography.presets.largeTitle}"
    subtitle: "{typography.presets.footnote}"
  listGroup:
    backgroundColor: "{colors.bg.card}"
    rounded: "{rounded.md}"
    rowHeight: 48px
    rowPaddingX: "{spacing.4}"
    divider: "1px {colors.separator}, 좌측 inset {spacing.4}"
    chevron: "› {colors.label.tertiary}"
    pressedFill: "{colors.fill.3}"
    sectionHeader: "13px / {colors.label.secondary} / 카드 밖 좌측 {spacing.4}"
  diaryCard:
    backgroundColor: "{colors.bg.card}"
    rounded: "{rounded.lg}"
    elevation: "{elevation.xs}"
    border: none
    padding: "{spacing.4}"
    moodDot: "8px 원형, mood 색"
    thumbnail: "64px, {rounded.md}"
  buttonPrimary:
    backgroundColor: "{colors.tint.base}"
    color: "{colors.tint.on}"
    rounded: "{rounded.md}"
    height: 50px
    fontWeight: 600
    pressed: "{colors.tint.pressed} + scale(0.98)"
  buttonTinted:
    backgroundColor: "{colors.tint.soft}"
    color: "{colors.tint.base}"
    rounded: "{rounded.md}"
    fontWeight: 600
  buttonPlain:
    color: "{colors.tint.base}"
    fontWeight: 600
  searchField:
    backgroundColor: "{colors.fill.2}"
    rounded: "{rounded.pill}"
    height: 40px
  sheet:
    rounded: "20px 20px 0 0"
    grabber: "36×5px {colors.fill.1} 캡슐, 상단 중앙"
    dim: "{material.overlayDim}"
    elevation: "{elevation.lg}"
  switch:
    size: "51×31px"
    on: "{colors.status.success}"
    off: "{colors.fill.1}"
    knob: "27px 흰 원 + {elevation.sm}"
  moodBadge:
    rounded: "{rounded.pill}"
    backgroundColor: "color-mix(in srgb, {colors.mood} 14%, transparent)"
    color: "mood 색을 25% 어둡게"
    fontSize: 12px
    fontWeight: 600
  aiChip:
    rounded: "{rounded.pill}"
    backgroundColor: "{colors.fill.2}"
    color: "{colors.label.secondary}"
    fontSize: 11px
    fontWeight: 600
    label: "✨ AI"
  reviewGateStory:
    backgroundColor: "rgba(255,204,0,0.10)"
    rounded: "{rounded.md}"
    padding: "{spacing.4}"
    note: "AI 생성 영역을 연한 노랑으로 분리해 사실(Fact)과 이야기(Story)를 시각적으로 구분"
---

# Memoism Design System — Apple Edition

> *스쳐 지나가는 일상을 기록하는 AI 일기 도우미.*
> **Apple HIG의 조용한 미니멀리즘** + 종이의 온기 한 방울. 콘텐츠(일기)가 주인공, UI는 물러난다.

이 문서는 [Google `DESIGN.md` spec](https://github.com/google-labs-code/design.md) 포맷을 따르는 **단일 진실 출처**다. 토큰은 `src/app/globals.css`의 CSS variables와 1:1 매핑된다. HIG 원문 근거는 [`docs/APPLE_DESIGN.md`](./docs/APPLE_DESIGN.md) 참고.

---

## 1. Overview

**Memoism은 "AI 일기 도우미"** 다. 페르소나는 *바쁘고 매일 일기 쓸 체력은 없지만 흘러가는 시간을 잡고 싶은* 30대 직장인.

### 디자인 방향 (v2 — Apple Edition)

- **Deference** — UI가 일기·사진에 양보한다. 배경은 조용한 웜 뉴트럴(`#F4F3F1`), 카드는 순백, 장식은 없다.
- **하나의 틴트** — 코랄(`#C44A38`) 단 한 색이 모든 인터랙티브 요소를 표시한다. 색이 보이면 "누를 수 있다"는 뜻. (배경 위 대비 ≈4.6:1, WCAG AA)
- **알파 위계** — 텍스트 위계는 회색 단계가 아니라 라벨 알파(100% → 60% → 34% → 18%)로.
- **재질(Material)** — 떠 있는 바(탭바·헤더)는 그림자가 아니라 블러 유리. 카드는 그림자 대신 배경 대비 + 헤어라인.
- **온기 유지** — 배경·fill·라벨에 웜 그레이 베이스. 차가운 블루 그레이 금지. 종이 일기장의 정서는 *틴트와 카피*로 잇는다.

### 사용 맥락

- **모바일 우선 PWA** — `--container-mobile: 390px`
- **밤 사용** — 22:00 푸시. 광원처럼 쨍한 화이트 면적을 줄이고 웜 뉴트럴로 받친다
- **사진 다중** — 수평 캐러셀 (세로 누적 금지)

---

## 2. Colors

### 배경 (2층 구조)
- `bg.base` `#F4F3F1` — 페이지 배경 (iOS systemGroupedBackground의 웜 버전)
- `bg.card` `#FFFFFF` — 카드·리스트 그룹·입력 시트

### 라벨 (알파 4단)
- `label.primary` `#1C1B1A` — 제목·본문
- `label.secondary` `rgba(60,56,50,0.60)` — 보조 텍스트·미리보기
- `label.tertiary` `rgba(60,56,50,0.34)` — placeholder·비활성·캡션
- `label.quaternary` `rgba(60,56,50,0.18)` — 장식적 아이콘

### Fill (면 분리·컨트롤 배경)
- `fill.1` 16% — 스위치 off 트랙, 진한 컨트롤
- `fill.2` 10% — 검색창, 인풋, 세그먼트 트랙
- `fill.3` 6% — 행 pressed 하이라이트

### 틴트 (단 하나)
- `tint.base` `#C44A38` — 코랄. CTA·링크·활성 탭·선택 상태 전부
- `tint.pressed` `#A23B2C` — pressed
- `tint.soft` 11% — tinted 버튼 배경, 선택 칩 배경

### Mood (감정 6종 — 분류 전용)
joy `#E9A13B` · calm `#4FB6A4` · sad `#6B8FC9` · love `#E2768C` · anger `#C04A57` · tired `#9C948A`
MoodPicker / MoodBadge / 캘린더 dot에서만. **본문·CTA에 mood 색 금지.**

### Status — iOS 시스템색 그대로
success `#34C759` · warning `#FF9500` · danger `#FF3B30` · info `#007AFF`

### Dark mode (활성)
`.dark`: bg `#000000` → 카드 `#1C1C1E` → elevated `#2C2C2E`, 라벨 `rgba(235,235,245, 1/0.6/0.3/0.18)`, 틴트는 한 단계 밝게 `#E8705C`.
적용: `localStorage('memoism-theme')` = `auto | light | dark`. `layout.tsx`의 pre-paint 스크립트가 첫 페인트 전에 `.dark`를 적용하고(플래시 방지), 설정 > 화면 > 테마 세그먼트(`ThemeToggle`)로 전환한다. 자동 모드는 `prefers-color-scheme`를 실시간 추적.

---

## 3. Typography

**전부 산세리프 하나.** SF Pro의 한국어 대응 = Pretendard (Apple 기기에선 `-apple-system`이 우선 적용돼 SF + Apple SD Gothic Neo로 렌더링).
명조(Gowun Batang)·손글씨(Gaegu)는 **v2에서 제거** — Apple은 UI에 세리프를 쓰지 않는다.

### Scale (iOS Dynamic Type 매핑)
| 토큰 | px | iOS 대응 |
|---|---|---|
| `display` | 40 | (웹 전용 히어로) |
| `3xl` | 34 | Large Title |
| `2xl` | 28 | Title 1 |
| `xl` | 22 | Title 2 |
| `lg` | 20 | Title 3 |
| `md` | 17 | **Body / Headline** |
| `base` | 15 | Subheadline (UI 기본) |
| `sm` | 13 | Footnote |
| `xs` | 12 | Caption |

### 규칙
- 큰 제목일수록 자간을 좁힌다 (`tracking.tight` -0.02em). **양수 자간 큰 제목 금지.**
- 위계는 사이즈보다 **weight(400/600/700) + 라벨 알파** 먼저.
- 일기 본문: 17px / line-height 1.7 / `label.primary`.
- UI 라벨·버튼: 15px / weight 500~600.
- 메타·날짜: 13px / `label.secondary`. 캡션: 12px / `label.tertiary`.

---

## 4. Layout

- **터치 타겟 최소 44×44px** — 아이콘 버튼도 히트 영역은 44 확보
- 페이지 좌우 패딩 `spacing.5`(20px), 그룹 리스트는 양옆 16~20 마진의 흰 카드
- 섹션 간 gap `spacing.6`~`spacing.8` — 호흡 있게
- Safe area `env(safe-area-inset-*)` 항상 보정
- 리스트 행: 높이 48~52, 좌우 패딩 16, 구분선은 좌측 16 inset 헤어라인

---

## 5. Elevation & Materials

- **리스트·카드: 그림자 거의 없음** — 흰 카드 vs 웜 뉴트럴 배경의 대비가 곧 분리. 필요하면 `elevation.xs`까지만
- **떠 있는 바(탭바·sticky 헤더): 블러 재질** — `rgba(244,243,241,0.82)` + `backdrop-filter: blur(20px) saturate(180%)` + 1px 헤어라인. 글로벌 유틸 `.glass` 사용
- **스크롤 반응 재질** — 스크롤 중에는 `.glass.is-scrolled`(0.93 불투명)로 진해진다 (`useScrolled` 훅). iOS 26 Liquid Glass의 "콘텐츠에 반응하는 재질" 저비용 근사
- ⚠️ **글래스 요소 안에 `position: fixed` 모달·시트를 두지 말 것** — backdrop-filter가 containing block을 만들어 시트가 엉뚱한 곳에 박힌다. BottomSheet·AiBusyOverlay는 body 포털로 렌더된다
- **시트·모달: `elevation.lg`** + dim `rgba(0,0,0,0.4)`
- 그림자 색은 순수 검정 저알파 — 갈색 그림자(v1) 폐지

---

## 6. Shapes

- `sm` 8px — 작은 썸네일, 칩 내부 요소
- `md` 12px — 버튼·인풋·리스트 그룹 *기본*
- `lg` 16px — 카드, 모달
- `xl` 22px — 큰 히어로 카드
- `pill` 999px — 검색창, 칩, 세그먼트, 스위치, FAB
- 시트 상단: 20px
- **0px 직각 금지. 한 화면에 radius 2~3종까지.**

---

## 7. Components

### TabBar (하단 탭바)
블러 유리(`.glass`) + 상단 헤어라인. 높이 52 + safe-area. 아이콘 22 + 라벨 11px(tracking 0, weight 500). 활성=틴트, 비활성=`label.tertiary`. ~~점 인디케이터~~ 제거. 가운데 + 버튼: 46px 틴트 원형, press 시 `scale(0.92)`+pressed 색 (스프링).

### Large Title Header (페이지 헤더)
34px/700/tight 산세리프 제목 + 13px secondary 부제. iOS 네비바의 Large Title 관습.

### List Group (설정·메뉴)
흰 카드(radius 12) 안에 행 48px. 행 사이 좌측 16 inset 헤어라인. 이동 행은 우측 `›`(tertiary). 행 press 시 `fill.3` 하이라이트. 섹션 제목은 카드 *밖* 좌측에 13px secondary.

### DiaryCard (일기 목록 카드)
흰 카드 radius 16, 그림자 xs, **테두리 없음**. 좌측 세로 바(v1) → **mood dot 8px**로 교체. 제목 17/600 + 미리보기 15/secondary 2줄 + 메타 13/tertiary. 우측 64px 썸네일(radius 12). 화살표 아이콘 없음 (카드 전체가 탭 영역, press 시 살짝 어둡게).

### Buttons
- **Filled**: 틴트 배경 + 흰 글자, radius 12, 높이 50(주요)/44(보조), weight 600. press: pressed 색 + scale 0.98
- **Tinted**: `tint.soft` 배경 + 틴트 글자 — 보조 액션
- **Plain**: 틴트 글자만 — 네비게이션 액션 (취소·완료)
- destructive: `#FF3B30`

### MoodBadge / MoodPicker
mood 색 14% 배경 캡슐 + mood 진한 글자 12px/600. **테두리 없음** (v1의 1.5px border 폐지). Picker는 한 줄 수평 스크롤 유지, 선택 시 mood 색 배경 + 흰 글자 + scale 스프링.

### AI chip ("✨ AI")
`fill.2` 배경 + secondary 글자 11px — **무채색으로 후퇴** (본문을 절대 압도하지 않는다).

### Review Gate (검토 게이트)
Fact(사실)·Story(AI 생성) 분리 유지. Story 영역은 연노랑 `rgba(255,204,0,0.10)` radius 12 — 시스템 옐로의 하이라이터 느낌. 사용자는 그 자리에서 수정 가능.

### Search Field
`fill.2` 배경 캡슐 40px, 좌측 돋보기(tertiary), 우측 원형 ✕.

### Sheet (bottom sheet)
상단 grabber(36×5 `fill.1` 캡슐) + radius 20 상단 + `elevation.lg` + dim 0.4. 등장: `ease.out` 420ms slide-up.

### Carousel (사진)
수평 스크롤 + scroll-snap 유지. 카드 radius 16. peek 효과 유지.

### Empty State (빈 상태)
아이콘(tertiary) + 17/600 한 줄 + 15/secondary 한 줄 + (선택) tinted 버튼. dashed border(v1) 폐지.

---

## 8. Do's and Don'ts

### ✅ Do
- **틴트는 코랄 하나** — 색이 보이면 인터랙티브라는 뜻이 되게
- **위계는 알파로** — 회색 hex 단계 대신 라벨 알파 4단
- **바는 블러, 카드는 대비** — 그림자는 시트·FAB에만
- **터치 타겟 44px** — 모바일 우선, press 피드백은 `:active` 기준 (hover 의존 금지)
- **한국어 카피는 권유형 유지** — "오늘 첫 줄, 시작해볼까?"
- **모션은 목적 있을 때만** — 시트 슬라이드, press scale, 상태 전환. 장식 모션 금지. `prefers-reduced-motion` 존중

### ❌ Don't
- **하루 한 편 원칙 깨지 마** — 오늘 일기 존재 시 추가 작성 CTA 금지
- **검토 게이트 우회 금지** — AI 생성은 반드시 사용자 검토 후 저장
- **mood 색을 CTA·본문에 쓰지 마** — 분류 전용
- **세리프·손글씨 UI 금지** — v2는 전부 산세리프 (구 Gowun Batang/Gaegu 토큰은 deprecated 별칭)
- **액센트 2색 이상 한 화면에 쓰지 마**
- **카드마다 그림자 두르지 마** — iOS 리스트는 평평하다
- **양수 자간 큰 제목 금지** — 큰 글자는 자간을 좁힌다
- **smart quote 카피 금지** — 시스템 곳곳에서 깨질 위험
- **사진 세로 누적 금지** — 수평 캐러셀

---

## 부록 A — 토큰 ↔ CSS variable 매핑

| DESIGN.md 토큰 | CSS variable |
|---|---|
| `{colors.bg.base}` | `--bg`, `--background` |
| `{colors.bg.card}` | `--surface`, `--surface-raised`, `--card` |
| `{colors.label.primary}` | `--fg`, `--foreground` |
| `{colors.label.secondary}` | `--fg-muted`, `--fg-subtle` |
| `{colors.label.tertiary}` | `--fg-placeholder` |
| `{colors.fill.1~3}` | `--fill-1` ~ `--fill-3` |
| `{colors.separator}` | `--border` (semantic), `--separator` |
| `{colors.tint.base}` | `--tint`, `--brand`, `--primary` |
| `{colors.mood.joy}` | `--mood-joy`, `--chart-1` |
| `{spacing.4}` | `--space-4` |
| `{rounded.md}` | `--radius-md`, `--radius` |
| `{elevation.xs}` | `--shadow-xs` |
| `{motion.duration.fast}` | `--duration-fast` |

## 부록 B — v1(종이·잉크) 레거시 별칭

v1 토큰을 참조하는 기존 코드가 깨지지 않도록 globals.css에 **deprecated 별칭**이 남아 있다. 새 코드에서 사용 금지:

| v1 변수 | 현재 값 |
|---|---|
| `--paper-0` | `--bg` |
| `--paper-1` `--paper-2` `--paper-3` | 웜 뉴트럴 단계 (fill 대용) |
| `--ink-1`~`--ink-5` | 라벨 알파 단계의 근사 불투명색 |
| `--accent-rose` / `--accent-rose-deep` / `--accent-rose-soft` | `--tint` / `--tint-pressed` / 틴트 소프트 |
| `--font-serif`, `--font-hand` | `--font-sans` (세리프 폐지) |
| `--shadow-paper` | `--shadow-sm` |
