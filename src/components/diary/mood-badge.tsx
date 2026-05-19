import {
  KNOWN_MOOD_KEYS,
  MOOD_COLOR,
  MOOD_EMOJI,
  MOOD_LABEL,
  type MoodKey,
} from "./mood-data";

interface MoodBadgeProps {
  mood: string;
  size?: "sm" | "md";
}

function isMoodKey(key: string): key is MoodKey {
  return KNOWN_MOOD_KEYS.has(key);
}

export function MoodBadge({ mood, size = "md" }: MoodBadgeProps) {
  const known = isMoodKey(mood);
  const emoji = known ? MOOD_EMOJI[mood] : "📝";
  const label = known ? MOOD_LABEL[mood] : mood;
  const color = known ? MOOD_COLOR[mood] : "var(--fg-subtle)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 3 : 4,
        padding: size === "sm" ? "2px 8px" : "4px 10px",
        borderRadius: "var(--radius-pill)",
        border: `1.5px solid ${color}`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        fontFamily: "var(--font-sans)",
        fontSize: size === "sm" ? 11 : "var(--text-xs)",
        color,
        fontWeight: 600,
        letterSpacing: "var(--tracking-wide)",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden style={{ fontSize: size === "sm" ? 12 : 14 }}>
        {emoji}
      </span>
      {label}
    </span>
  );
}
