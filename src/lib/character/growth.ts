export const GROWTH_LEVELS = [
  { level: 1, name: "아기", minPoints: 0 },
  { level: 2, name: "유아", minPoints: 21 },
  { level: 3, name: "어린이", minPoints: 61 },
  { level: 4, name: "청소년", minPoints: 151 },
  { level: 5, name: "성인", minPoints: 301 },
] as const;

export type GrowthLevel = (typeof GROWTH_LEVELS)[number];

export function calcGrowthPoints(
  daysSinceBorn: number,
  diaryCount: number,
): number {
  return daysSinceBorn * 1 + diaryCount * 3;
}

export function getGrowthLevel(points: number): GrowthLevel {
  for (let i = GROWTH_LEVELS.length - 1; i >= 0; i--) {
    if (points >= GROWTH_LEVELS[i].minPoints) return GROWTH_LEVELS[i];
  }
  return GROWTH_LEVELS[0];
}

export function getNextLevel(current: GrowthLevel): GrowthLevel | null {
  const next = GROWTH_LEVELS.find((l) => l.level === current.level + 1);
  return next ?? null;
}

export function getProgressToNext(
  points: number,
  current: GrowthLevel,
  next: GrowthLevel | null,
): number {
  if (!next) return 100;
  const range = next.minPoints - current.minPoints;
  const earned = points - current.minPoints;
  return Math.min(100, Math.round((earned / range) * 100));
}

/** 오늘의 말풍선 메시지 (레벨별, 수면 상태 고려) */
export function getBubbleMessage(levelName: string, isAsleep: boolean): string {
  if (isAsleep) return "...zzz 💤";

  const messages: Record<string, string[]> = {
    아기: ["오늘 하루 어땠어? 🍼", "나랑 이야기해줄래? 👀", "일기 써줘, 보고 싶어! ✏️"],
    유아: ["오늘도 일기 쓸 거지? 🌱", "오늘 하루 어땠어?", "뭔가 재밌는 일 있었어? 😊"],
    어린이: ["오늘 하루 기록해볼까? 📖", "어떤 하루였어? 말해줘!", "오늘의 감정이 궁금해 🎨"],
    청소년: ["오늘 어떤 하루였어?", "잊고 싶지 않은 순간 있었어?", "일기로 남겨두자 📝"],
    성인: ["오늘 하루도 수고했어.", "오늘의 이야기를 기록해둘까?", "작은 순간도 소중하니까 ✨"],
  };

  const pool = messages[levelName] ?? messages["아기"];
  // 날짜 기반 고정 선택 (매일 같은 메시지, 새로고침마다 바뀌지 않게)
  const dayIndex = Math.floor(Date.now() / 86400000) % pool.length;
  return pool[dayIndex];
}
