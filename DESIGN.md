---
version: alpha
name: Memoism Design System
description: 스쳐 지나가는 일상을 기록하는 AI 일기 도우미. 종이와 잉크의 메타포로 디지털 일기의 물성을 회복한다.

colors:
  paper:
    "0": "#FBF6EC"
    "1": "#F5EEDF"
    "2": "#ECE2CD"
    "3": "#E0D2B5"
  ink:
    "1": "#2A2118"
    "2": "#4A3D2E"
    "3": "#7A6A55"
    "4": "#A89682"
    "5": "#C8B89F"
  accent:
    rose: "#C97B6B"
    roseSoft: "#E5B5A8"
    roseDeep: "#9E5849"
    sage: "#8A9A7B"
    sageSoft: "#C4D0B5"
    lilac: "#A89BB8"
    amber: "#D9A05B"
  mood:
    joy: "#E8B86D"
    calm: "#A6C0B4"
    sad: "#8FA3BD"
    love: "#D89B95"
    anger: "#C47A6F"
    tired: "#B0A89A"
  semantic:
    bg: "{colors.paper.0}"
    surface: "{colors.paper.1}"
    surfaceRaised: "#FFFCF4"
    border: "{colors.paper.2}"
    borderStrong: "{colors.ink.5}"
    fg: "{colors.ink.1}"
    fgMuted: "{colors.ink.2}"
    fgSubtle: "{colors.ink.3}"
    fgPlaceholder: "{colors.ink.4}"
    brand: "{colors.accent.rose}"
    brandDeep: "{colors.accent.roseDeep}"
  status:
    success: "#7A9A6E"
    warning: "#D9A05B"
    danger: "#B86A5C"
    info: "#8FA3BD"

typography:
  fonts:
    serif: "'Gowun Batang', 'Noto Serif KR', Georgia, serif"
    sans: "'Pretendard', 'Gowun Dodum', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
    hand: "'Gaegu', 'Gowun Dodum', cursive"
    mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', monospace"
  scale:
    xs: 11px
    sm: 13px
    base: 15px
    md: 17px
    lg: 20px
    xl: 24px
    "2xl": 30px
    "3xl": 38px
    display: 48px
  lineHeight:
    tight: 1.25
    snug: 1.4
    normal: 1.6
    relaxed: 1.85
  tracking:
    tight: -0.02em
    normal: 0
    wide: 0.04em
    wider: 0.12em
  presets:
    display:
      fontFamily: "{typography.fonts.serif}"
      fontSize: "{typography.scale.display}"
      lineHeight: "{typography.lineHeight.tight}"
      letterSpacing: "{typography.tracking.tight}"
      color: "{colors.semantic.fg}"
    h1:
      fontFamily: "{typography.fonts.serif}"
      fontSize: "{typography.scale.3xl}"
      lineHeight: "{typography.lineHeight.tight}"
      letterSpacing: "{typography.tracking.tight}"
    h2:
      fontFamily: "{typography.fonts.serif}"
      fontSize: "{typography.scale.2xl}"
      lineHeight: "{typography.lineHeight.snug}"
    h3:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.xl}"
      fontWeight: 600
      lineHeight: "{typography.lineHeight.snug}"
    body:
      fontFamily: "{typography.fonts.serif}"
      fontSize: "{typography.scale.base}"
      lineHeight: "{typography.lineHeight.relaxed}"
      color: "{colors.semantic.fgMuted}"
    ui:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.sm}"
      lineHeight: "{typography.lineHeight.normal}"
    caption:
      fontFamily: "{typography.fonts.sans}"
      fontSize: "{typography.scale.xs}"
      lineHeight: "{typography.lineHeight.normal}"
      letterSpacing: "{typography.tracking.wider}"
      color: "{colors.semantic.fgSubtle}"

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
  sm: 6px
  md: 10px
  lg: 16px
  xl: 24px
  pill: 999px

elevation:
  xs: "0 1px 2px rgba(74,61,46,0.06)"
  sm: "0 2px 6px rgba(74,61,46,0.08)"
  md: "0 4px 16px rgba(74,61,46,0.10)"
  lg: "0 12px 32px rgba(74,61,46,0.14)"
  paper: "0 1px 0 rgba(255,252,244,0.6) inset, 0 2px 8px rgba(74,61,46,0.08)"

motion:
  ease:
    out: "cubic-bezier(0.22,1,0.36,1)"
    inOut: "cubic-bezier(0.65,0,0.35,1)"
  duration:
    fast: 140ms
    base: 240ms
    slow: 420ms

layout:
  container:
    mobile: 390px
    tablet: 768px
    page: 1100px

components:
  diaryCard:
    backgroundColor: "{colors.semantic.surface}"
    border: "1px solid {colors.semantic.border}"
    rounded: "{rounded.md}"
    elevation: "{elevation.xs}"
    padding: "{spacing.4} {spacing.5}"
    accentBar:
      width: 3px
      colorSource: "{colors.mood}"
    thumbnail:
      size: 80px
      rounded: "{rounded.md}"
  moodBadge:
    rounded: "{rounded.pill}"
    border: "1.5px solid {colors.mood}"
    backgroundColor: "color-mix(in srgb, {colors.mood} 12%, transparent)"
    fontFamily: "{typography.fonts.sans}"
    fontWeight: 600
    letterSpacing: "{typography.tracking.wide}"
  aiChip:
    rounded: "{rounded.pill}"
    backgroundColor: "color-mix(in srgb, {colors.accent.rose} 14%, transparent)"
    color: "{colors.accent.roseDeep}"
    fontSize: 10px
    fontWeight: 700
    label: "✨ AI"
  buttonPrimary:
    backgroundColor: "{colors.semantic.fg}"
    color: "{colors.semantic.bg}"
    rounded: "{rounded.md}"
    padding: "{spacing.3} {spacing.4}"
    elevation: "{elevation.sm}"
    fontFamily: "{typography.fonts.sans}"
    fontWeight: 600
  inputBare:
    backgroundColor: transparent
    border: none
    outline: none
    fontFamily: "{typography.fonts.serif}"
    color: "{colors.semantic.fg}"
  reviewGateStory:
    backgroundColor: "color-mix(in srgb, #FFF4CC 30%, transparent)"
    border: "1px solid color-mix(in srgb, #FFF4CC 60%, transparent)"
    rounded: "{rounded.md}"
    padding: "{spacing.4}"
    note: "AI 생성 영역을 *연한 노란 종이* 색으로 분리해 사실(Fact)과 이야기(Story)를 시각적으로 구분"
---

# Memoism Design System

> *스쳐 지나가는 일상을 기록하는 AI 일기 도우미.*
> *종이·잉크·따뜻한 sepia. 손글씨의 물성, 디지털의 가벼움.*

이 문서는 [Google `DESIGN.md` spec](https://github.com/google-labs-code/design.md)을 따른다. AI 에이전트가 UI를 만들거나 검토할 때 일관된 시각 언어를 유지하기 위한 단일 진실 출처(single source of truth)다. 토큰은 `src/app/globals.css`의 CSS variables와 1:1 매핑된다.

---

## 1. Overview

**Memoism은 "AI 일기 도우미"** 다. 페르소나는 *바쁘고 매일 일기 쓸 체력은 없지만 흘러가는 시간을 잡고 싶은* 30대 직장인. 핵심 가치는 두 가지:

- **회고할 데이터가 존재한다** — 사진·텍스트만 던지면 AI가 일기로 정리, 1년 뒤에도 검색·재방문 가능
- **가벼운 방법** — 의무감·죄책감을 강요하지 않음. "오늘 첫 줄, 시작해볼까?" 같은 권유 톤

### 브랜드 톤

- **따뜻함** — 차가운 청회색 톤 X, 베이지 종이·갈색 잉크의 sepia 분위기
- **사적임** — 화려한 UI X, 책장 한 권을 펼친 듯한 *조용한 페이지*
- **친밀함** — 한국어 손글씨 폰트(Gaegu)와 격조 있는 명조체(Gowun Batang) 공존
- **AI를 거든 손길** — 자동 생성이지만 결과는 늘 *내 일기*. AI 영역은 ✨로 식별되지만 *마커가 본문을 압도하지 않게* 절제

### 사용 맥락

- **모바일 우선 PWA** — `--container-mobile: 390px` 기본
- **밤 시간 사용** — 22:00 KST 푸시. 어두운 환경에서 광원 X
- **사진 다중** — 사진은 *세로 누적이 아닌 수평 캐러셀*로 본문 접근 부담 줄임

---

## 2. Colors

색은 **종이(paper) + 잉크(ink)** 두 축이 기본. 액센트(accent)는 강조와 브랜드, 무드(mood)는 일기의 감정 분류용. *상태색(success/warning/danger/info)* 은 따로 정의되어 있지만 같은 sepia 팔레트 안에서 살짝 채도만 옮긴 형태로 — UI가 *전체적으로 같은 종이*에 그려진 느낌.

### Paper (배경 4단계)
- `paper.0` `#FBF6EC` — 메인 배경
- `paper.1` `#F5EEDF` — surface (카드, 헤더)
- `paper.2` `#ECE2CD` — border, muted
- `paper.3` `#E0D2B5` — disabled, divider 강조

### Ink (전경 5단계, 어두움 → 밝음)
- `ink.1` `#2A2118` — fg (본문)
- `ink.2` `#4A3D2E` — fgMuted (서브 본문)
- `ink.3` `#7A6A55` — fgSubtle (캡션·메타)
- `ink.4` `#A89682` — placeholder
- `ink.5` `#C8B89F` — border-strong

### Accent
- `rose` `#C97B6B` — 메인 브랜드 (CTA, 강조)
- `roseSoft` `#E5B5A8` — secondary accent
- `roseDeep` `#9E5849` — 헤더 로고 "메모이즘", AI chip 텍스트
- `sage` `#8A9A7B` — 보조
- `amber` `#D9A05B` — 따뜻한 알림

### Mood (감정 6종, 사용자 일기 분류)
- `joy` 노란 황금 / `calm` 청록 / `sad` 푸른 회색 / `love` 분홍 / `anger` 빨간 갈색 / `tired` 잿빛 베이지

Mood 색은 *MoodPicker / MoodBadge / DiaryCard accentBar*에서만 사용. 본문·CTA에 mood 색을 사용하지 말 것 — 감정 분류의 의미가 흐려진다.

### Dark mode

`.dark`에서 paper ↔ ink가 *역전* (배경은 ink, 전경은 paper). accent는 `roseSoft`로 더 옅게. 메모이즘은 *밤에 켜는 종이등불* 같은 분위기.

---

## 3. Typography

3개 폰트 패밀리. *각자 역할이 분명*하게 분리되어 있음:

| Family | 용도 |
|---|---|
| **Gowun Batang** (명조) | 일기 본문, h1~h2, display — 격조와 손글씨의 중간 |
| **Pretendard** (산세리프) | UI 라벨, 버튼, 캡션, 메타 정보 — 가독성 우선 |
| **Gaegu** (손글씨) | *드물게* 사용. 메모·앱 인트로의 *물성 강조* 순간만 |

### Scale (11~48px, 9단계)
xs 11 · sm 13 · base 15 · md 17 · lg 20 · xl 24 · 2xl 30 · 3xl 38 · display 48

### 프리셋 (즉시 적용 가능)
- `display` — 랜딩·인트로 거대 제목 (display + serif)
- `h1` — 일기 제목, 페이지 제목
- `h2` — 섹션 제목
- `h3` — 카드 제목 (sans)
- `body` — 일기 본문 (serif, leading 1.85)
- `ui` — 버튼·라벨 (sans, 13px)
- `caption` — 날짜·메타 (sans, 11px, tracking 0.12em)

본문은 **반드시 serif + leading-relaxed (1.85)**. UI 컴포넌트는 sans. 손글씨(Gaegu)는 별도 강조 외 X.

---

## 4. Layout

**모바일 우선**. 데스크탑은 모바일 너비를 중앙 정렬한 *책의 한 페이지* 형태.

- `container.mobile` 390px — 기본 앱 shell
- `container.tablet` 768px — 태블릿 대응
- `container.page` 1100px — 데스크탑 최대 (외부 여백)

### Spacing (4px base, 11단계)
1·2·3·4·5·6·8·10·12·16·20

- 카드 내부 padding: `spacing.4` ~ `spacing.5`
- 섹션 간 gap: `spacing.5` ~ `spacing.6`
- 페이지 좌우 padding: `spacing.5`
- 큰 여백 (히어로): `spacing.8` ~ `spacing.12`

기본은 *덜 빽빽하게*. 일기 앱이라 호흡이 있어야.

---

## 5. Elevation & Depth

**Warm sepia shadow**. 일반적인 회색 그림자가 아니라 잉크 색(`#4A3D2E`)을 옅게 깔아 종이가 종이 위에 놓인 느낌.

- `xs` — 카드 기본
- `sm` — 버튼 hover
- `md` — 다이얼로그
- `lg` — bottom sheet
- `paper` — *살짝 들려 있는 종이* (inset highlight + 부드러운 그림자). 강조 카드.

그림자 강도를 *세게 쓰지 말 것*. 종이 위 종이는 살짝만 떠 있다.

---

## 6. Shapes

- `sm` 6px — 작은 chip, 캡션 박스
- `md` 10px — 카드·버튼·입력 *기본*
- `lg` 16px — 큰 카드 (오늘의 일기 위젯), 모달
- `xl` 24px — 시트, 큰 박스
- `pill` 999px — chip (MoodBadge, AI chip), bottom nav 동그란 + 버튼

*sharp corner(0px) 금지*. 종이는 살짝 둥글다.

---

## 7. Components

### DiaryCard (일기 목록 카드)
좌측에 mood accent 세로 바(3px) + 본문 영역 + 우측 80×80 썸네일(있을 때). 클릭 시 detail로. 카드 자체가 시각 단서라 *우측 화살표 아이콘 없음*.

### MoodBadge (감정 뱃지)
mood 색 1.5px border + 12% 채워진 배경. 이모지 + 한국어 라벨 (joy → "기쁨"). *모든 mood 색은 채도가 비슷*해서 강한 색이 하나도 튀지 않음 — 일기 목록에 한 화면 6개 mood가 섞여도 평온.

### MoodPicker (감정 선택)
6개를 **한 줄 수평 스크롤**로. 두 줄 X. 모바일 한 화면에서 다 보이지 않아도 자연스럽게 swipe. `.hide-scrollbar`로 스크롤바 숨김.

### AI chip ("✨ AI")
*베이지 배경에서 묻히지 않도록* `accent.rose` 14% 배경 + `roseDeep` 텍스트. AI가 만든 일기에 작게 부착. **본문을 압도하지 말 것** — 10px 폰트.

### Review Gate (검토 게이트)
**Fact 영역** (사실 정보 — EXIF, 사진 개수, 날짜) 과 **Story 영역** (AI 생성 본문)을 *시각적으로 분리*. Story는 *연한 노란 종이*(`#FFF4CC` 30%) 배경 — *AI가 만든 것임을 색으로 표시*. 사용자는 본문을 그 자리에서 *수정 가능*.

### Carousel (사진 캐러셀)
세로 grid가 아닌 **수평 스크롤 + scroll-snap**. 카드 너비 `min(78%, 280px)` — 다음 사진이 살짝 비치는 *peek 효과*. 일기 detail에서 사진 N장이 본문 접근을 막지 않게.

### BottomNav (하단 내비)
5탭. 가운데 + 버튼이 작성 진입의 *글로벌 단축*. 홈에 별도 작성 CTA를 *추가로 두지 않음* (중복 회피).

### Today Widget (오늘의 일기)
- 작성된 경우: 카드 (썸네일 + snippet)
- 미작성: dashed border + "오늘 첫 줄, 시작해볼까?" *권유 톤* — 죄책감 강요 X

---

## 8. Do's and Don'ts

### ✅ Do
- **종이·잉크 메타포 유지** — 배경은 paper, 전경은 ink. 화이트(`#FFF`)는 surface raised 용도 정도만 (`#FFFCF4`)
- **모바일 우선 + 호흡 있게** — 빽빽한 dense UI X. 일기는 시간을 들여 보는 매체
- **AI 영역은 *식별 가능하되 절제*하게** — 옅은 노란 배경 + 작은 ✨. 본문보다 *덜* 튀어야
- **mood 색은 분류용에만** — CTA, 본문, 헤더에 mood 색 사용 X
- **한국어 카피는 *권유형*** — "오늘 일기 써!" X → "오늘 첫 줄, 시작해볼까?" O
- **그림자는 옅게** — sepia 톤, 강한 검정 그림자 X
- **카드의 우측 화살표 등 *불필요한 affordance* 제거** — 카드 자체가 click 단서

### ❌ Don't
- **하루 한 편 원칙 깨지 마** — 오늘 일기 있을 때 "또 하나 더 기록하기" 같은 CTA 추가 X
- **AI가 본문을 압도하게 만들지 마** — ✨ 마커가 본문보다 크거나 강한 색 사용 X
- **mood 6개를 두 줄로 깨지 마** — 한 줄 수평 스크롤 고정
- **smart quote(`""` 같은 곡선 따옴표) 카피에 쓰지 마** — `.env.local` 사고처럼 시스템 곳곳에서 깨질 위험
- **sharp corner 0px 쓰지 마** — 종이는 둥글다
- **검토 게이트를 *우회*하는 흐름 만들지 마** — AI 생성은 *반드시 사용자 검토 후* 저장
- **사진을 일기 본문 위로 누적하지 마** — 수평 캐러셀로

---

## 부록 — 토큰 ↔ CSS variable 매핑

DESIGN.md의 YAML 토큰은 `src/app/globals.css`의 CSS variables와 1:1 매핑된다. 변경 시 *둘 다 갱신* 필요. (V2에 자동 동기화 스크립트 검토)

| DESIGN.md 토큰 | CSS variable |
|---|---|
| `{colors.paper.0}` | `--paper-0`, `--bg`, `--background` |
| `{colors.ink.1}` | `--ink-1`, `--fg`, `--foreground` |
| `{colors.accent.rose}` | `--accent-rose`, `--brand`, `--primary` |
| `{colors.mood.joy}` | `--mood-joy`, `--chart-1` |
| `{spacing.4}` | `--space-4` |
| `{rounded.md}` | `--radius-md`, `--radius` |
| `{elevation.xs}` | `--shadow-xs` |
| `{typography.fonts.serif}` | `--font-serif` |
| `{motion.duration.fast}` | `--duration-fast` |
