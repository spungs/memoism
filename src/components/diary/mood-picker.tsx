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

/** 감정을 고르지 않은 채 저장되지 않게 하는 기본값. 호출자가 초기값으로 쓴다. */
export const DEFAULT_MOOD: MoodKey = 'calm'

interface MoodPickerProps {
  value: MoodKey
  onChange: (mood: MoodKey) => void
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
      {/* 6칸 한 줄 — 가로 칩은 390px에서 4개만 보이고 화남·피곤이 스크롤 뒤에
          숨었다. 이모지를 위, 글자를 아래로 세워 한 줄에 다 넣는다(320px에서도
          칸당 ~39px). 스크롤 컨테이너가 아니라 선택 시 scale로 커져도 잘리지 않는다. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${MOODS.length}, 1fr)`,
          gap: 6,
        }}
      >
        {MOODS.map((mood) => {
          const isSelected = value === mood.key
          return (
            <button
              key={mood.key}
              type="button"
              // 다시 눌러도 해제하지 않는다 — 감정 미설정으로 저장되는 길을 막는다.
              onClick={() => onChange(mood.key)}
              aria-pressed={isSelected}
              aria-label={mood.label}
              className="pressable"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                minWidth: 0,
                minHeight: 56,
                padding: '8px 0',
                borderRadius: 'var(--radius-md)',
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
              <span style={{ fontSize: 20, lineHeight: 1 }}>{mood.emoji}</span>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: isSelected ? mood.onColor : 'var(--fg-muted)',
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
