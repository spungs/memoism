import "server-only";
import { dateKeyInZone, formatHmInZone } from "@/lib/tz";

// Gemini 프롬프트에 넣는 EXIF 사실 요약을 **현지 시간대**로 포맷한다.
// toISOString()/UTC 기준으로 넣으면 17:23 KST가 "08:23"으로 보여 모델이
// "아침 8시"로 오인하는 버그가 있었다. 같은 이유로 해외에서 찍은 사진을 KST로
// 넣으면 뉴욕 저녁 9시가 "오전 10시"가 된다(2026-09-29) — 기기 시간대로 맞춘다.

export type ExifSummaryItem = {
  takenAt: string | Date | null;
  lat: number | null;
  lng: number | null;
};

// ISO 문자열 또는 Date를 현지 "YYYY-MM-DD HH:mm" 문자열로.
function formatLocal(value: string | Date, tz: string): string | null {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${dateKeyInZone(d, tz)} ${formatHmInZone(d, tz)}`;
}

/**
 * EXIF 사실(시간·장소) 요약을 현지 시간대(`tz`, 요청 기기) 기준으로 생성한다.
 * 시각·위치가 하나도 없으면 undefined.
 * create 플로우(auto-generate)와 regenerate 플로우 양쪽이 공유한다.
 */
export function buildExifSummary(
  items: ExifSummaryItem[],
  tz: string,
): string | undefined {
  const lines = items
    .map((item, i) => {
      const parts: string[] = [];
      if (item.takenAt != null) {
        const at = formatLocal(item.takenAt, tz);
        if (at) parts.push(`시간 ${at}`);
      }
      if (item.lat != null && item.lng != null) {
        parts.push(`위치 ${item.lat.toFixed(4)},${item.lng.toFixed(4)}`);
      }
      return parts.length > 0 ? `사진${i + 1} — ${parts.join(", ")}` : null;
    })
    .filter((line): line is string => line !== null);
  return lines.length > 0 ? lines.join("\n") : undefined;
}
