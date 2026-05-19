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
          // hide scrollbar (Webkit + Firefox)
          scrollbarWidth: 'none',
          paddingBottom: 4,
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
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: isSelected
                  ? `2px solid ${mood.color}`
                  : '2px solid transparent',
                backgroundColor: isSelected
                  ? `color-mix(in srgb, ${mood.color} 15%, transparent)`
                  : 'var(--surface)',
                cursor: 'pointer',
                transition: 'all var(--duration-fast) var(--ease-out)',
                outline: 'none',
                boxShadow: isSelected
                  ? `0 0 0 1px color-mix(in srgb, ${mood.color} 25%, transparent)`
                  : 'none',
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{mood.emoji}</span>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 10,
                  color: isSelected ? mood.color : 'var(--fg-subtle)',
                  fontWeight: isSelected ? 700 : 400,
                  letterSpacing: 'var(--tracking-wide)',
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
