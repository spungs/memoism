'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { CharacterSVG, type CharacterSkinSlug } from './character-svg'
import {
  calcGrowthPoints,
  getGrowthLevel,
  getNextLevel,
  getProgressToNext,
} from '@/lib/character/growth'

type Message = {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  createdAt: string
}

type CharacterData = {
  id: string
  userId: string
  age: number
  bornAt: string
  isAsleep: boolean
  coinBalance: number
  subscriptionStatus: string
  trialStartedAt: string | null
  subscriptionExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

interface CharacterChatViewProps {
  character: CharacterData
  diaryCount: number
  initialMessages: Message[]
  skin?: CharacterSkinSlug
}

export function CharacterChatView({
  character,
  diaryCount,
  initialMessages,
  skin,
}: CharacterChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const daysSinceBorn = Math.floor(
    (Date.now() - new Date(character.bornAt).getTime()) / 86400000
  )
  const points = calcGrowthPoints(daysSinceBorn, diaryCount)
  const currentLevel = getGrowthLevel(points)
  const nextLevel = getNextLevel(currentLevel)
  const progress = getProgressToNext(points, currentLevel, nextLevel)

  const trialDaysLeft = character.trialStartedAt
    ? Math.max(
        0,
        30 - Math.floor((Date.now() - new Date(character.trialStartedAt).getTime()) / 86400000)
      )
    : null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    setTimeout(() => {
      const reply: Message = {
        id: crypto.randomUUID(),
        role: 'ASSISTANT',
        content: getPlaceholderReply(text, currentLevel.name),
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, reply])
      setIsLoading(false)
    }, 800)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const statusLabel =
    character.subscriptionStatus === 'TRIAL'
      ? `트라이얼 ${trialDaysLeft}일 남음`
      : character.subscriptionStatus === 'ACTIVE'
      ? '구독 중'
      : character.subscriptionStatus === 'EXPIRED'
      ? '구독 만료'
      : '미구독'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100svh - 56px)',
        backgroundColor: 'var(--bg)',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: 'var(--space-4) var(--space-5)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ flexShrink: 0 }}>
            <CharacterSVG skin={skin} level={currentLevel.level} isAsleep={character.isAsleep} size={80} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                color: 'var(--accent-rose-deep)',
                letterSpacing: 'var(--tracking-wider)',
                backgroundColor: 'var(--accent-rose-soft)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
              }}>
                LV.{currentLevel.level} {currentLevel.name}
              </span>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-xs)',
                color: 'var(--fg-subtle)',
              }}>
                {statusLabel}
              </span>
              <Link
                href="/character/shop"
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--accent-rose)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                🛍 상점 →
              </Link>
            </div>

            {nextLevel && (
              <div style={{ marginBottom: 6 }}>
                <div style={{
                  height: 5,
                  backgroundColor: 'var(--paper-2)',
                  borderRadius: 'var(--radius-pill)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: 'var(--accent-rose)',
                    borderRadius: 'var(--radius-pill)',
                    transition: 'width 1s var(--ease-out)',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--fg-subtle)' }}>
                    성장 {progress}%
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--fg-subtle)' }}>
                    → {nextLevel.name}까지 {nextLevel.minPoints - points}포인트
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {[
                { label: '탄생', value: `${daysSinceBorn}일째` },
                { label: '일기', value: `${diaryCount}개` },
                { label: '코인', value: `🪙${character.coinBalance}` },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--fg-subtle)', marginBottom: 1 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--fg)' }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-4) var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            marginTop: 'var(--space-8)',
          }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-md)', color: 'var(--fg-subtle)' }}>
              안녕! 나한테 뭐든 말해줘 🌱
            </p>
          </div>
        )}

        {messages.filter(m => m.role !== 'SYSTEM').map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'USER' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '75%',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: msg.role === 'USER'
                ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
                : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
              backgroundColor: msg.role === 'USER' ? 'var(--accent-rose)' : 'var(--surface)',
              border: msg.role === 'USER' ? 'none' : '1px solid var(--border)',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--leading-relaxed)',
                color: msg.role === 'USER' ? '#fff' : 'var(--fg)',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </p>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                color: msg.role === 'USER' ? 'rgba(255,255,255,0.7)' : 'var(--fg-subtle)',
                margin: '4px 0 0',
                textAlign: 'right',
              }}>
                {new Date(msg.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-rose)',
                    animation: `memo-bob ${0.8 + i * 0.15}s ease-in-out infinite`,
                    opacity: 0.7,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{
        borderTop: '1px solid var(--border)',
        padding: 'var(--space-3) var(--space-4)',
        backgroundColor: 'var(--surface-raised)',
        flexShrink: 0,
        paddingBottom: 'calc(var(--space-3) + env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="캐릭터에게 말 걸어봐요..."
            disabled={character.isAsleep}
            rows={1}
            style={{
              flex: 1,
              fontFamily: 'var(--font-serif)',
              fontSize: 'var(--text-sm)',
              lineHeight: 'var(--leading-relaxed)',
              color: 'var(--fg)',
              backgroundColor: 'var(--bg)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '10px 14px',
              resize: 'none',
              outline: 'none',
              transition: 'border-color var(--duration-fast) var(--ease-out)',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent-rose)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || character.isAsleep}
            style={{
              width: 40, height: 40,
              borderRadius: 'var(--radius-pill)',
              backgroundColor: input.trim() && !isLoading ? 'var(--accent-rose)' : 'var(--paper-2)',
              border: 'none',
              cursor: input.trim() && !isLoading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color var(--duration-fast) var(--ease-out)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !isLoading ? '#fff' : 'var(--ink-4)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        {character.isAsleep && (
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--fg-subtle)',
            textAlign: 'center',
            marginTop: 6,
          }}>
            💤 캐릭터가 잠들어 있어요. 구독을 갱신하면 대화할 수 있어요.
          </p>
        )}
      </div>
    </div>
  )
}

function getPlaceholderReply(userText: string, levelName: string): string {
  const replies: Record<string, string[]> = {
    '아기': [
      '응응! 🍼',
      '좋아좋아!',
      '나도 그런 거 같아~ 😊',
      '일기에도 써줘!',
    ],
    '유아': [
      '그렇구나~ 나도 궁금했어!',
      '오늘 일기에 적어둘게 📖',
      '더 말해줘, 듣고 싶어!',
    ],
    '어린이': [
      '음... 생각해봤는데, 그게 맞는 것 같아.',
      '오늘 하루 어떤 기분이었어?',
      '일기에 적어두면 나중에 좋을 것 같아.',
    ],
    '청소년': [
      '공감해. 그런 날 있잖아.',
      '나도 같이 기억해줄게.',
      '그 감정, 일기에 남겨둬.',
    ],
    '성인': [
      '오늘도 수고했어. 그 마음, 기억해둘게.',
      '작은 것도 소중하니까.',
      '말해줘서 고마워.',
    ],
  }
  const pool = replies[levelName] ?? replies['아기']
  return pool[Math.floor(Math.random() * pool.length)]
}
