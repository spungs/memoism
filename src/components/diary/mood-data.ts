// Mood 데이터 — 클라/서버 어디서든 import 가능.
// mood-picker.tsx는 "use client"라 server component가 직접 .map() 등을 호출하면
// build 시 "MOODS.map is not a function" 에러 (RSC 모듈 shim 한계).
// 그래서 데이터는 이 파일에 분리, UI는 mood-picker.tsx 유지.

// onColor: mood 색을 배경으로 깔았을 때(감정 선택칸) 글자색. 흰 글자는 화남에서만
// 대비 기준을 넘는다(기쁨 2.2:1 ~ 피곤 3.0:1, 점검 M18). 나머지는 진한 글자로
// 5.2:1 이상. mood 색은 라이트·다크 공통이라 테마 분기가 필요 없다.
const INK_DARK = "#1C1B1A";
const INK_LIGHT = "#FFFFFF";

export const MOODS = [
  { key: "joy", label: "기쁨", emoji: "😊", color: "var(--mood-joy)", onColor: INK_DARK },
  { key: "calm", label: "평온", emoji: "😌", color: "var(--mood-calm)", onColor: INK_DARK },
  { key: "sad", label: "슬픔", emoji: "😢", color: "var(--mood-sad)", onColor: INK_DARK },
  { key: "love", label: "사랑", emoji: "🥰", color: "var(--mood-love)", onColor: INK_DARK },
  { key: "anger", label: "화남", emoji: "😤", color: "var(--mood-anger)", onColor: INK_LIGHT },
  { key: "tired", label: "피곤", emoji: "😴", color: "var(--mood-tired)", onColor: INK_DARK },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];

export const MOOD_EMOJI: Record<MoodKey, string> = MOODS.reduce(
  (acc, m) => {
    acc[m.key] = m.emoji;
    return acc;
  },
  {} as Record<MoodKey, string>,
);

export const MOOD_LABEL: Record<MoodKey, string> = MOODS.reduce(
  (acc, m) => {
    acc[m.key] = m.label;
    return acc;
  },
  {} as Record<MoodKey, string>,
);

export const MOOD_COLOR: Record<MoodKey, string> = MOODS.reduce(
  (acc, m) => {
    acc[m.key] = m.color;
    return acc;
  },
  {} as Record<MoodKey, string>,
);

export const KNOWN_MOOD_KEYS: ReadonlySet<string> = new Set(MOODS.map((m) => m.key));
