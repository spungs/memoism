'use client'

export const MOODS = [
  { key: 'joy',   label: '기쁨', emoji: '😊', color: 'var(--mood-joy)'   },
  { key: 'calm',  label: '평온', emoji: '😌', color: 'var(--mood-calm)'  },
  { key: 'sad',   label: '슬픔', emoji: '😢', color: 'var(--mood-sad)'   },
  { key: 'love',  label: '사랑', emoji: '🥰', color: 'var(--mood-love)'  },
  { key: 'anger', label: '화남', emoji: '😤', color: 'var(--mood-anger)' },
  { key: 'tired', label: '피곤', emoji: '😴', color: 'var(--mood-tired)' },
] as const

export type MoodKey = typeof MOODS[number]['key']

export const MOOD_EMOJI: Record<MoodKey, string> = MOODS.reduce(
  (acc, m) => {
    acc[m.key] = m.emoji
    return acc
  },
  {} as Record<MoodKey, string>,
)

export const MOOD_LABEL: Record<MoodKey, string> = MOODS.reduce(
  (acc, m) => {
    acc[m.key] = m.label
    return acc
  },
  {} as Record<MoodKey, string>,
)

export const MOOD_COLOR: Record<MoodKey, string> = MOODS.reduce(
  (acc, m) => {
    acc[m.key] = m.color
    return acc
  },
  {} as Record<MoodKey, string>,
)

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
          textTransform: 'uppercase',
        }}
      >
        오늘의 감정
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
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
