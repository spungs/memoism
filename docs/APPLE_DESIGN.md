# Apple Design Reference — Memoism 적용판

> Apple Human Interface Guidelines(HIG)에서 Memoism PWA에 적용할 핵심 규칙만 추린 레퍼런스.
> 프로젝트의 실제 토큰 값은 [`DESIGN.md`](../DESIGN.md)가 단일 진실 출처이고, 이 문서는 *왜 그렇게 정했는지*의 근거(HIG 원문 규칙)를 담는다.
>
> 출처: [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/) ·
> [apple-design-system (token화 정리)](https://github.com/cmurphy1140/apple-design-system) ·
> [apple-hig-designer REFERENCE.md](https://github.com/axiaoge2/apple-hig-designer)

---

## 1. 3대 원칙

| 원칙 | 의미 | Memoism 적용 |
|---|---|---|
| **Hierarchy (위계)** | 콘텐츠가 주인공, 크롬(UI 장식)은 물러난다 | 일기 본문·사진이 화면의 90%. 버튼·배지·마커는 절제 |
| **Harmony (조화)** | 플랫폼 관습과 일치하는 동작·모양 | iOS 표준 패턴: 그룹 리스트, 시트, 탭바, 스위치 |
| **Consistency (일관)** | 같은 의미는 항상 같은 모양 | 틴트 1색, radius 2단, 타이포 프리셋 고정 |

**Deference**: UI는 콘텐츠에 양보한다. 배경은 조용한 뉴트럴, 색은 *의미가 있을 때만*.

## 2. Color — iOS 시맨틱 컬러 체계

### 구조: 배경 3단 + 라벨 4단 + 틴트 1색

```
배경:  systemGroupedBackground(#F2F2F7) → 카드(#FFFFFF) → 인셋 필드(fill)
라벨:  label(불투명) → secondaryLabel(60%) → tertiaryLabel(30%) → quaternary(18%)
구분선: separator rgba(60,60,67,0.29) — 1px 헤어라인, 좌측 인셋
```

- **틴트(tint)는 앱 전체에 단 하나.** 인터랙티브 요소(버튼·링크·활성 탭·스위치 on)에만 사용.
- 라벨은 **회색 hex가 아니라 알파(투명도)로** 위계를 만든다 — 어떤 배경 위에서도 자연스럽게 섞인다.
- 시스템 상태색: success `#34C759` / warning `#FF9500` / danger `#FF3B30` / info `#007AFF`.
- **Fill** (입력창·비활성 버튼 배경): `rgba(120,120,128,0.12~0.20)` — 면 분리는 그림자보다 fill로.

### Dark
배경 `#000000` → 카드 `#1C1C1E` → elevated `#2C2C2E`. 라벨 `rgba(235,235,245, 1/0.6/0.3/0.18)`.

## 3. Typography — SF 텍스트 스타일

SF Pro(한국어: Apple SD Gothic Neo ≒ **Pretendard**)의 Dynamic Type 스케일:

| Style | Size | Weight | 용도 |
|---|---|---|---|
| Large Title | 34 | 700 | 페이지 대제목 (스크롤 시 인라인으로 축소) |
| Title 1 | 28 | 700 | 모달 제목 |
| Title 2 | 22 | 700 | 섹션 큰 제목 |
| Title 3 | 20 | 600 | 카드 제목 |
| Headline | 17 | 600 | 리스트 행 제목 |
| **Body** | **17** | 400 | 본문 (일기 콘텐츠) |
| Callout | 16 | 400 | 보조 본문 |
| Subheadline | 15 | 400 | UI 기본 |
| Footnote | 13 | 400 | 메타·설명 |
| Caption 1 | 12 | 400 | 날짜·라벨 |
| Caption 2 | 11 | 400/500 | 탭바 라벨 |

- 큰 사이즈일수록 **자간을 좁힌다** (Large Title ≈ -0.02em). 과한 양수 letter-spacing 금지.
- 위계는 사이즈보다 **weight + 라벨 알파**로 먼저 만든다.
- 본문 줄높이 1.5 내외. UI 라벨은 1.2~1.35.

## 4. Layout

- **터치 타겟 최소 44×44pt.** 보이는 크기가 작아도 히트 영역은 44 확보.
- 좌우 마진 16~20. 그룹 인셋 리스트(iOS 설정 앱)는 양옆 16 마진 + radius 10~12 카드.
- 8pt 그리드: 4/8/12/16/20/24/32.
- Safe area: `env(safe-area-inset-*)` 항상 보정 (노치·홈 인디케이터).
- 리스트 행 높이 44~52, 행 내부 패딩 좌우 16.

## 5. Materials & Elevation

- **떠 있는 바(탭바·네비바)는 그림자가 아니라 블러 재질**:
  `backdrop-filter: blur(20px) saturate(180%)` + 반투명 배경(72~85%) + 1px 헤어라인.
- 리스트·카드엔 그림자를 거의 쓰지 않는다. 면 분리는 **배경색 차이 + 헤어라인**.
- 그림자는 *떠 있는 요소*(시트, 팝오버, FAB)에만: 부드럽고 넓게, 진하지 않게
  (모달 `0 20px 60px rgba(0,0,0,0.2)` 수준).

## 6. Shape

- 연속 곡률(continuous corner) 느낌: 버튼 12, 카드 12~16, 시트 상단 16~20, 칩·세그먼트는 캡슐(999).
- 0px 직각 금지. 한 화면에 radius 종류는 2~3개까지만.

## 7. Motion

- 목적 있는 모션만: 화면 전환, 시트 등장, 상태 변화. 장식적 모션 금지.
- 시트/전환: `cubic-bezier(0.32, 0.72, 0, 1)` 400~500ms (iOS 시트 스프링 근사).
- 마이크로 인터랙션(버튼 press): scale 0.96~0.97 + 120~180ms.
- 터치 피드백은 **누른 즉시** (hover가 아니라 active 기준, 모바일 우선).
- `prefers-reduced-motion` 존중.

## 8. 컴포넌트 관습

| 컴포넌트 | iOS 관습 |
|---|---|
| **탭바** | 블러 재질, 49pt + safe-area, 아이콘 위 라벨(10~11pt·tracking 없음), 활성=틴트·비활성=회색. 점 인디케이터 없음 |
| **네비게이션 바** | Large Title(34·bold) → 스크롤 시 인라인(17·semibold) + 블러 바 |
| **버튼** | Filled(틴트 배경·흰 글자), Tinted(틴트 12% 배경·틴트 글자), Plain(틴트 글자). 높이 50(대), 44(중), 캡슐 또는 12 radius |
| **리스트 행** | 흰 카드 안 행 + 헤어라인 구분(좌측 인셋), 이동 행엔 우측 chevron(›), 행 전체가 탭 영역, 누르면 fill 하이라이트 |
| **스위치** | 51×31 캡슐, on=초록(#34C759) 또는 틴트, 흰 노브 + 그림자 |
| **시트** | 상단 grabber(36×5 회색 캡슐), radius 16~20, 배경 dim rgba(0,0,0,0.4) |
| **검색창** | fill 배경 캡슐(높이 36~40), 좌측 돋보기, 우측 원형 ✕ |
| **빈 상태** | 아이콘 + 한 줄 제목 + 한 줄 설명 + (선택) 액션 버튼. 죄책감 주는 카피 금지 |
| **세그먼트** | fill 배경 캡슐 트랙 + 흰색 선택 thumb(그림자 xs) |

## 9. Don't (Apple이 하지 않는 것)

- 한 화면에 액센트색 2개 이상
- 본문보다 화려한 장식 (그라데이션 배경, 테두리 남용)
- 양수 letter-spacing이 큰 제목, 명조체 UI 라벨
- 리스트 카드마다 그림자
- 회색 불투명 placeholder (→ 알파 라벨)
- 작은 터치 타겟 (44pt 미만)
- hover에만 반응하는 인터랙션 (모바일에서 죽는다)
