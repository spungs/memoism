'use client'

// 데이터는 mood-data.ts에 분리됨 (server component에서도 import 가능).
// 기존 import 경로 backward compat 위해 여기서 re-export.
export {
  MOODS,
  MOOD_EMOJI,
  MOOD_LABEL,
  MOOD_COLOR,
  KNOWN_MOOD_KEYS,
  type MoodKey,
} from './mood-data'
import { MOODS, type MoodKey } from './mood-data'

interface MoodPickerProps {
  value: MoodKey | null
  onChange: (mood: MoodKey | null) => void
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div>
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          color: 'var(--fg-subtle)',
          letterSpacing: 'var(--tracking-wider)',
          fontWeight: 600,
          textTransform: 'uppercase',
          margin: 0,
          marginBottom: 'var(--space-2)',
        }}
      >
        오늘의 감정
      </p>
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          overflowX: 'auto',
          paddingBottom: 2,
        }}
        className="hide-scrollbar"
      >
        {MOODS.map((mood) => {
          const isSelected = value === mood.key
          return (
            <button
              key={mood.key}
              type="button"
              onClick={() => onChange(isSelected ? null : mood.key)}
              aria-pressed={isSelected}
              aria-label={mood.label}
              className="pressable"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                minHeight: 36,
                padding: '0 12px',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                backgroundColor: isSelected
                  ? mood.color
                  : 'var(--fill-2)',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background-color var(--duration-fast) var(--ease-out), transform var(--duration-base) var(--ease-bounce)',
                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{mood.emoji}</span>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: isSelected ? '#fff' : 'var(--fg-muted)',
                  letterSpacing: 0,
                }}
              >
                {mood.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
