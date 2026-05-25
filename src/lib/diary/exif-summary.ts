import "server-only";

// Gemini 프롬프트에 넣는 EXIF 사실 요약을 KST(UTC+9)로 포맷한다.
// toISOString()/UTC 기준으로 넣으면 17:23 KST가 "08:23"으로 보여 모델이
// "아침 8시"로 오인하는 버그가 있었다. 사용자 화면(review-gate)이 보여주는
// KST 시각과 동일하게 맞춘다.

export type ExifSummaryItem = {
  takenAt: string | Date | null;
  lat: number | null;
  lng: number | null;
};

// ISO 문자열 또는 Date를 KST(UTC+9) "YYYY-MM-DD HH:mm" 문자열로.
function formatKst(value: string | Date): string | null {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const mo = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const h = String(kst.getUTCHours()).padStart(2, "0");
  const mi = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${mi} KST`;
}

/**
 * EXIF 사실(시간·장소) 요약을 KST 기준으로 생성한다.
 * 시각·위치가 하나도 없으면 undefined.
 * create 플로우(auto-generate)와 regenerate 플로우 양쪽이 공유한다.
 */
export function buildExifSummary(
  items: ExifSummaryItem[],
): string | undefined {
  const lines = items
    .map((item, i) => {
      const parts: string[] = [];
      if (item.takenAt != null) {
        const kst = formatKst(item.takenAt);
        if (kst) parts.push(`시간 ${kst}`);
      }
      if (item.lat != null && item.lng != null) {
        parts.push(`위치 ${item.lat.toFixed(4)},${item.lng.toFixed(4)}`);
      }
      return parts.length > 0 ? `사진${i + 1} — ${parts.join(", ")}` : null;
    })
    .filter((line): line is string => line !== null);
  return lines.length > 0 ? lines.join("\n") : undefined;
}
