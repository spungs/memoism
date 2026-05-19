// Mood 데이터 — 클라/서버 어디서든 import 가능.
// mood-picker.tsx는 "use client"라 server component가 직접 .map() 등을 호출하면
// build 시 "MOODS.map is not a function" 에러 (RSC 모듈 shim 한계).
// 그래서 데이터는 이 파일에 분리, UI는 mood-picker.tsx 유지.

export const MOODS = [
  { key: "joy", label: "기쁨", emoji: "😊", color: "var(--mood-joy)" },
  { key: "calm", label: "평온", emoji: "😌", color: "var(--mood-calm)" },
  { key: "sad", label: "슬픔", emoji: "😢", color: "var(--mood-sad)" },
  { key: "love", label: "사랑", emoji: "🥰", color: "var(--mood-love)" },
  { key: "anger", label: "화남", emoji: "😤", color: "var(--mood-anger)" },
  { key: "tired", label: "피곤", emoji: "😴", color: "var(--mood-tired)" },
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
